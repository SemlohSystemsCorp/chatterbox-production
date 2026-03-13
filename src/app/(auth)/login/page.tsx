"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleButton } from "../oauth-buttons";
import { signIn } from "../actions";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(
    callbackError === "auth_callback_failed" ? "Authentication failed. Please try again." : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    if (turnstileToken) formData.set("cf-turnstile-response", turnstileToken);
    const result = await signIn(formData);
    if (result?.error) setError(result.error);
    setIsLoading(false);
  }

  return (
    <div className="auth-card">
      <p className="auth-title">Log in to Chatterbox</p>
      <p className="auth-subtitle">Enter your credentials to continue.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="jane@company.com"
            required
          />
        </div>

        <div className="field">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label className="label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--ds-primary)" }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="Your password"
            required
          />
        </div>

        {next && <input type="hidden" name="next" value={next} />}

        <TurnstileWidget
          onVerify={handleTurnstileVerify}
          onExpire={handleTurnstileExpire}
          className="my-1"
        />

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>
          {isLoading && <span className="spinner spinner-sm spinner-white" />}
          Log in
        </button>
      </form>

      <div className="auth-divider">or</div>

      <GoogleButton />

      <p className="auth-footer">
        Don&apos;t have an account?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
