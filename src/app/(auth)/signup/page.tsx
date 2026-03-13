"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleButton } from "../oauth-buttons";
import { signUp } from "../actions";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function passwordStrength(pw: string): { label: string; color: string } | null {
  if (!pw) return null;
  if (pw.length < 8) return { label: "Too short", color: "#ef4444" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (score <= 2) return { label: "Weak", color: "#f59e0b" };
  if (score === 3) return { label: "Good", color: "#10b981" };
  return { label: "Strong", color: "#10b981" };
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const fullName = (formData.get("fullName") as string).trim();
    const pw = formData.get("password") as string;

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (turnstileToken) formData.set("cf-turnstile-response", turnstileToken);

    setIsLoading(true);
    const result = await signUp(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result.success) {
      const email = formData.get("email") as string;
      router.push(
        next
          ? `/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
          : `/verify?email=${encodeURIComponent(email)}`
      );
    }
  }

  return (
    <>
      <div className="auth-card">
        <p className="auth-title">Create your account</p>
        <p className="auth-subtitle">Get started with Chatterbox for free.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input"
              placeholder="Jane Doe"
              required
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="jane@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength && (
              <p style={{ fontSize: 12, color: strength.color, marginTop: 4 }}>
                {strength.label}
              </p>
            )}
          </div>

          <TurnstileWidget
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
            className="my-1"
          />

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>
            {isLoading && <span className="spinner spinner-sm spinner-white" />}
            Create account
          </button>
        </form>

        <div className="auth-divider">or</div>

        <GoogleButton />

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Log in</Link>
        </p>
      </div>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.6 }}>
        By creating an account, you agree to our{" "}
        <Link href="/terms" style={{ color: "var(--ds-muted)", textDecoration: "underline" }}>Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" style={{ color: "var(--ds-muted)", textDecoration: "underline" }}>Privacy Policy</Link>.
      </p>
    </>
  );
}
