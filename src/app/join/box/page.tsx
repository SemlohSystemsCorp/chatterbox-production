"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { joinBoxByCode } from "@/app/(auth)/actions";

export default function JoinBoxPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await joinBoxByCode(code.trim());

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(`/box/${result.boxSlug}`);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ds-bg)", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="card card-body">
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)", marginBottom: 4 }}>
            Join a workspace
          </h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 20 }}>
            Enter the 8-digit code shared by your workspace admin.
          </p>

          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="code">Workspace code</label>
              <input
                id="code"
                type="text"
                className="input"
                placeholder="12345678"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setError(null);
                }}
                maxLength={8}
                required
                autoFocus
                style={{ fontFamily: "monospace", letterSpacing: "0.15em", fontSize: 18, textAlign: "center" }}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={isLoading || code.length !== 8}
            >
              {isLoading ? (
                <><span className="spinner spinner-sm spinner-white" /> Joining…</>
              ) : (
                "Join workspace"
              )}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ds-muted)", textDecoration: "none" }}
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
