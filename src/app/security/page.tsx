import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Chatterbox Security — how we protect your data with encryption, secure infrastructure, and best practices.",
  alternates: { canonical: `${baseUrl}/security` },
  openGraph: { url: `${baseUrl}/security` },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-foreground">
            <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
            Chatterbox
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/pricing" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/signup" className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-10">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="text-xs font-medium text-primary">Security at Chatterbox</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Your data is safe with us
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Security isn&apos;t an afterthought — it&apos;s built into every layer of Chatterbox. Here&apos;s how
            we keep your team&apos;s communication secure.
          </p>
        </div>
      </section>

      {/* Security features */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "Encryption in transit",
                desc: "All data transmitted between your browser and our servers is encrypted using TLS 1.3. API calls, WebSocket connections, and file uploads are all protected.",
              },
              {
                title: "Encryption at rest",
                desc: "Messages, files, and user data are encrypted at rest using AES-256 encryption. Database backups are also encrypted.",
              },
              {
                title: "Secure authentication",
                desc: "Passwords are hashed with bcrypt. We support email verification, magic links, and OAuth (Google). Session tokens are rotated regularly.",
              },
              {
                title: "Bot protection",
                desc: "Cloudflare Turnstile protects sign-up and login forms from automated abuse without intrusive CAPTCHAs.",
              },
              {
                title: "Row-level security",
                desc: "Database access is enforced with row-level security policies. Users can only access data they are authorized to see — enforced at the database level, not just the application.",
              },
              {
                title: "Secure file storage",
                desc: "Uploaded files are stored in private, encrypted cloud storage with signed URLs that expire. Files are scanned and validated before storage.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-background p-6">
                <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Infrastructure</h2>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              Chatterbox is hosted on <strong className="text-foreground">Vercel</strong> with a global edge
              network. Our database and real-time infrastructure run on <strong className="text-foreground">Supabase</strong>,
              which is backed by dedicated PostgreSQL instances with automated backups, point-in-time recovery, and
              network isolation.
            </p>
            <p>
              Video and audio calls are powered by <strong className="text-foreground">Daily.co</strong>, which
              provides end-to-end encrypted media streams. Payment processing is handled by{" "}
              <strong className="text-foreground">Stripe</strong>, a PCI DSS Level 1 certified provider — we never
              store credit card numbers on our servers.
            </p>
          </div>
        </div>
      </section>

      {/* Practices */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Our practices</h2>
          <div className="space-y-4">
            {[
              "Principle of least privilege for all internal access",
              "Regular dependency audits and automated vulnerability scanning",
              "Environment variables and secrets managed securely — never committed to source control",
              "Input validation and output encoding to prevent injection attacks",
              "Rate limiting on authentication endpoints",
              "Automated backups with point-in-time recovery",
            ].map((practice) => (
              <div key={practice} className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3ecf8e]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-muted-foreground">{practice}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-lg px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">Report a vulnerability</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            If you discover a security vulnerability, please report it responsibly. We take all reports seriously
            and will respond promptly.
          </p>
          <a
            href="mailto:hello@georgeholmes.io"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-primary-hover"
          >
            Contact us
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
