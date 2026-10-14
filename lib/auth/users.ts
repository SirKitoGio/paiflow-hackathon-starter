import "server-only";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

type StoredUser = {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  createdAt: string;
};
export type PublicUser = { id: string; username: string; email: string };

const file = () => process.env.TRANCHE_USERS_FILE ?? path.join(process.cwd(), "data", "users.json");
const processState = globalThis as typeof globalThis & { __trancheUsersLock?: Promise<unknown> };

async function load(): Promise<StoredUser[]> {
  try {
    const parsed = JSON.parse(await readFile(file(), "utf8")) as { users?: StoredUser[] };
    return parsed.users ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    // Fail closed: never overwrite an accounts file we could not parse.
    throw new Error("Tranche accounts file is unreadable.");
  }
}

async function save(users: StoredUser[]) {
  const target = file();
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ users }, null, 2), { mode: 0o600 });
  await rename(tmp, target);
}

function withUsers<T>(fn: (users: StoredUser[]) => T | Promise<T>): Promise<T> {
  const run = (processState.__trancheUsersLock ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const users = await load();
      const result = await fn(users);
      await save(users);
      return result;
    });
  processState.__trancheUsersLock = run;
  return run;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scryptAsync(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown, so the response time doesn't reveal which emails exist.
const dummyHash = hashPassword(randomUUID());

const toPublic = (u: StoredUser): PublicUser => ({ id: u.id, username: u.username, email: u.email });

export class EmailTakenError extends Error {}

export async function createUser(input: { username: string; email: string; password: string; phone: string | null }) {
  const passwordHash = await hashPassword(input.password);
  return withUsers((users) => {
    if (users.some((u) => u.email === input.email)) throw new EmailTakenError();
    const user: StoredUser = {
      id: randomUUID(),
      username: input.username,
      email: input.email,
      phone: input.phone,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    return toPublic(user);
  });
}

export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  const user = (await load()).find((u) => u.email === email);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  return user && ok ? toPublic(user) : null;
}

export async function findUser(id: string): Promise<PublicUser | null> {
  const user = (await load()).find((u) => u.id === id);
  return user ? toPublic(user) : null;
}
