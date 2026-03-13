"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { verifyCode, resendVerificationCode } from "../actions";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const next = searchParams.get("next");

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      handleSubmit(pasted);
    }
  }

  async function handleSubmit(fullCode?: string) {
    const codeStr = fullCode || code.join("");
    if (codeStr.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("code", codeStr);

    const result = await verifyCode(formData);

    if (result.error) {
      setError(result.error);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setIsLoading(false);
    } else if (result.success) {
      if (result.tokenHash) {
        const supabase = createClient();
        await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: "magiclink",
        });
      }
      const onboardingUrl = next
        ? `/onboarding?next=${encodeURIComponent(next)}`
        : "/onboarding";
      router.push(onboardingUrl);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    const result = await resendVerificationCode(email);
    if (result.error) {
      setError(result.error);
    } else {
      setResendCooldown(60);
      setError(null);
    }
  }

  if (!email) return null;

  return (
    <>
      <div className="auth-card">
        <p className="auth-title">Verify your email</p>
        <p className="auth-subtitle">
          Enter the 6-digit code sent to{" "}
          <strong style={{ color: "var(--ds-heading)", fontWeight: 600 }}>{email}</strong>
        </p>

        <div
          style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}
          onPaste={handlePaste}
        >
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isLoading}
              style={{
                width: 44,
                height: 52,
                textAlign: "center",
                fontSize: 20,
                fontWeight: 600,
                border: "1px solid var(--ds-border)",
                borderRadius: "var(--ds-radius)",
                background: "var(--ds-surface)",
                color: "var(--ds-heading)",
                outline: "none",
                transition: "border-color var(--ds-transition), box-shadow var(--ds-transition)",
                flexShrink: 0,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ds-primary)";
                e.target.style.boxShadow = "0 0 0 3px var(--ds-primary-focus)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--ds-border)";
                e.target.style.boxShadow = "none";
              }}
            />
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={() => handleSubmit()}
          disabled={isLoading || code.join("").length !== 6}
        >
          {isLoading && <span className="spinner spinner-sm spinner-white" />}
          Verify email
        </button>

        <p className="auth-footer">
          Didn&apos;t receive a code?{" "}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontWeight: 500,
              color: resendCooldown > 0 ? "var(--ds-muted)" : "var(--ds-primary)",
              cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
              fontSize: "inherit",
              fontFamily: "inherit",
            }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </p>
      </div>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.6 }}>
        By continuing, you agree to our{" "}
        <Link href="/terms" style={{ color: "var(--ds-muted)", textDecoration: "underline" }}>Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" style={{ color: "var(--ds-muted)", textDecoration: "underline" }}>Privacy Policy</Link>.
      </p>
    </>
  );
}
