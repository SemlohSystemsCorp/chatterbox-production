import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Sign in",
    template: "%s — Chatterbox",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <Link href="/" className="auth-brand">
          <img src="/icon.svg" alt="" style={{ height: 28, width: 28, borderRadius: 8 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ds-heading)" }}>
            Chatterbox
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
