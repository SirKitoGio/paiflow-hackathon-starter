"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./login.css";

export function LoginCard() {
  const router = useRouter();
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
            const formData = new FormData(e.currentTarget);
            const email = (formData.get("email") as string) || "demo@tranche.finance";
            try {
              localStorage.setItem("tranche_user", JSON.stringify({ email }));
            } catch {}
            router.push("/dashboard");
          }}
        >
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            aria-label="Email address"
            autoComplete="email"
            defaultValue="demo@tranche.finance"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            defaultValue="tranche2026"
            required
          />
          <p className="lg-forgot">
            Forgot Password? <Link href="/signup">Click here</Link>
          </p>
          <button type="submit" className="lg-login">Log in</button>
        </form>

        <p className="lg-or">or sign in with</p>
        <button
          type="button"
          className="lg-alt"
          onClick={() => {
            try {
              localStorage.setItem("tranche_user", JSON.stringify({ email: "google.user@tranche.finance" }));
            } catch {}
            router.push("/dashboard");
          }}
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
