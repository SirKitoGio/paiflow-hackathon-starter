"use client";
import { IntegrationError } from "@/lib/browser-api";

const plain: Record<string, string> = {
  UNAUTHENTICATED: "Email or password is incorrect.",
  RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
  CONFLICT: "An account with this email already exists. Log in instead.",
};

/** A short, user-facing message for a failed auth request. */
export function authErrorText(error: unknown) {
  if (error instanceof IntegrationError) {
    if (plain[error.code]) return plain[error.code]!;
    // VALIDATION messages are written for users: "VALIDATION: Enter a valid email address."
    if (error.code === "VALIDATION") return error.message.replace(/^VALIDATION: /, "").split(" · ")[0]!.trim();
  }
  return "Something went wrong. Please try again.";
}
