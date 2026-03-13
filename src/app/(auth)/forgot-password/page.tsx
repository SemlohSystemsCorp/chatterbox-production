"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "../actions";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.success);
    }

    setIsLoading(false);
  }

  return (
    <div className="auth-card">
      <p className="auth-title">Reset your password</p>
      <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link.</p>

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

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>
          {isLoading && <span className="spinner spinner-sm spinner-white" />}
          Send reset link
        </button>
      </form>

      <p className="auth-footer">
        <Link href="/login">← Back to login</Link>
      </p>
    </div>
  );
}
