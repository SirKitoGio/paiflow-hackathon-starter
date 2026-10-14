"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserRequest } from "@/lib/browser-api";
import { authErrorText } from "@/lib/auth/client";
import "./login.css";

export function LoginCard() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function logIn(form: HTMLFormElement) {
    const data = new FormData(form);
    setError(null);
    setBusy(true);
    try {
      await browserRequest("/api/auth/login", { email: data.get("email"), password: data.get("password") });
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(authErrorText(err));
      setBusy(false);
    }
  }
  return (
    <main
      className="lg"
      style={
        {
          "--mono": "'Roboto Mono', monospace",
          "--anon": "'Anonymous Pro', monospace",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        } as React.CSSProperties
      }
    >
      <div className="lg-bg" aria-hidden="true" />
      <section className="lg-card" aria-label="Sign in">
        <header className="lg-head">
          <Link href="/" className="lg-brand">
            <svg width="56" height="54" viewBox="0 0 82 82" aria-hidden="true" style={{ overflow: "visible" }}>
              <defs>
                <filter id="lg-glow" x="0" y="0" width="82" height="82" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="12.7" />
                </filter>
              </defs>
              <g filter="url(#lg-glow)">
                <ellipse cx="40.77" cy="40.77" rx="24.5" ry="24.5" fill="#B54880" />
              </g>
              <image href="/images/logo.svg" x="13" y="14" width="55.69" height="54.16" preserveAspectRatio="none" />
            </svg>
            <span>tranche</span>
          </Link>
          <h1>Welcome!</h1>
          <p>
            First time organizing? <Link href="/signup">Sign up for free</Link>
          </p>
        </header>

        <form
          className="lg-form"
          onSubmit={(e) => {
            e.preventDefault();
            void logIn(e.currentTarget);
          }}
        >
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            aria-label="Email address"
            autoComplete="email"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            required
          />
          <p className="lg-forgot">
            Forgot Password? <Link href="/signup">Click here</Link>
          </p>
          {error && <p className="lg-error" role="alert">{error}</p>}
          <button type="submit" className="lg-login" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        </form>

        <p className="lg-or">or sign in with</p>
        <button
          type="button"
          className="lg-alt"
          onClick={() => setError("Google sign-in isn't available yet. Log in with your email and password.")}
        >
          <span className="lg-g" aria-hidden="true">G</span>
          Google (Demo)
        </button>

        <p className="lg-terms">
          You acknowledge that you read, and agree, to our Terms of Service and our Privacy Policy.
        </p>
      </section>
    </main>
  );
}
