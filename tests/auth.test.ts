import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { SESSION_TTL_SECONDS, createSessionToken, readSessionToken } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/users";

const origin = "http://localhost";
const post = (url: string, body: unknown, from = origin) =>
  new Request(`${origin}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: from },
    body: JSON.stringify(body),
  });
const cookieOf = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";
const whoAmI = (cookie: string) => me(new Request(`${origin}/api/auth/me`, { headers: { cookie } }));
const account = { username: "Keith", email: "Keith@Example.com", password: "correct horse" };

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "s".repeat(64));
  vi.stubEnv("TRANCHE_USERS_FILE", path.join(mkdtempSync(path.join(tmpdir(), "tranche-auth-")), "users.json"));
});
afterEach(() => vi.unstubAllEnvs());

it("hashes passwords with a salt and verifies them", async () => {
  const a = await hashPassword("secret-pass");
  expect(a).not.toContain("secret-pass");
  expect(a).not.toBe(await hashPassword("secret-pass"));
  expect(await verifyPassword("secret-pass", a)).toBe(true);
  expect(await verifyPassword("wrong-pass", a)).toBe(false);
});

it("accepts only untampered, unexpired session tokens signed with the secret", async () => {
  const token = await createSessionToken("user-1");
  expect(await readSessionToken(token)).toBe("user-1");
  expect(await readSessionToken(`${token.slice(0, -2)}xx`)).toBeNull();
  const [, signature] = token.split(".");
  const forged = `${btoa(JSON.stringify({ uid: "admin", exp: 9e9 })).replace(/=+$/, "")}.${signature}`;
  expect(await readSessionToken(forged)).toBeNull();
  expect(await readSessionToken(token, Date.now() + (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull();
  vi.stubEnv("SESSION_SECRET", "t".repeat(64));
  expect(await readSessionToken(token)).toBeNull();
  vi.stubEnv("SESSION_SECRET", "");
  expect(await readSessionToken(token)).toBeNull();
});

it("signs up, keeps the session, rejects duplicates, and logs in with the right password only", async () => {
  const created = await signup(post("/api/auth/signup", account));
  expect(created.status).toBe(200);
  const cookie = cookieOf(created);
  expect(created.headers.get("set-cookie")).toMatch(/HttpOnly; SameSite=Lax/);
  expect((await (await whoAmI(cookie)).json()).data).toMatchObject({ username: "Keith", email: "keith@example.com" });

  expect((await signup(post("/api/auth/signup", account))).status).toBe(409);
  expect((await login(post("/api/auth/login", { email: account.email, password: "wrong password" }))).status).toBe(401);
  expect((await login(post("/api/auth/login", { email: "nobody@example.com", password: "whatever1" }))).status).toBe(401);

  const loggedIn = await login(post("/api/auth/login", { email: "keith@example.com", password: account.password }));
  expect(loggedIn.status).toBe(200);
  expect((await (await whoAmI(cookieOf(loggedIn))).json()).data.email).toBe("keith@example.com");
  expect((await whoAmI("")).status).toBe(401);
});

it("rejects other origins, short passwords, and clears the cookie on logout", async () => {
  expect((await signup(post("/api/auth/signup", account, "https://evil.example"))).status).toBe(403);
  expect((await signup(post("/api/auth/signup", { ...account, password: "short" }))).status).toBe(422);
  const out = await logout(post("/api/auth/logout", {}));
  expect(out.headers.get("set-cookie")).toMatch(/^tranche_session=; .*Max-Age=0/);
});

it("limits repeated failed logins", async () => {
  for (let i = 0; i < 10; i++)
    await login(post("/api/auth/login", { email: "limit@example.com", password: "wrong pass" }));
  expect((await login(post("/api/auth/login", { email: "limit@example.com", password: "wrong pass" }))).status).toBe(429);
});
