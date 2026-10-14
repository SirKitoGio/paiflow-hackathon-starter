import "server-only";
import { PaiflowError } from "@/lib/paiflow";
import { InputError } from "@/lib/http";

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new PaiflowError(
      403,
      { code: "FORBIDDEN", message: "Use this application's origin." },
      null,
      null,
    );
}
/** Parses a JSON object body whose keys are all in `allowed`. */
export async function jsonBody(request: Request, allowed: string[]) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InputError("Expected JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new InputError("Expected an object.");
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    throw new InputError("Unknown fields.");
  return value;
}
export function roundNumber(value: unknown): number {
  const n = typeof value === "string" && /^\d{1,3}$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 100)
    throw new InputError("Supply a round number.");
  return n as number;
}
export function signedXdr(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 200_000)
    throw new InputError("Supply a signedXdr string.");
  return value;
}
export function publicKey(value: unknown): string {
  if (typeof value !== "string" || !/^G[A-Z2-7]{55}$/.test(value))
    throw new InputError("Supply a public G-address.");
  return value;
}
