import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Chatterbox Privacy Policy — how we collect, use, and protect your personal information.",
  alternates: { canonical: `${baseUrl}/privacy` },
  openGraph: { url: `${baseUrl}/privacy` },
};

export default function PrivacyPage() {
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
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 13, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Information We Collect</h2>
              <p className="mb-2">We collect the following types of information:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Account information:</strong> Name, email address, and password when you create an account.</li>
                <li><strong className="text-foreground">Organization data:</strong> Organization name, member list, and billing details for paid plans.</li>
                <li><strong className="text-foreground">Messages & files:</strong> Content you send through channels, threads, DMs, and file uploads.</li>
                <li><strong className="text-foreground">Usage data:</strong> How you interact with the Service, including features used and session duration.</li>
                <li><strong className="text-foreground">Device information:</strong> Browser type, operating system, and IP address for security and analytics.</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide, maintain, and improve the Service</li>
                <li>To process payments and manage subscriptions</li>
                <li>To send transactional emails (verification, invites, billing receipts)</li>
                <li>To detect and prevent fraud, abuse, and security threats</li>
                <li>To respond to support requests and communicate with you</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. What We Don&apos;t Do</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>We do not sell your personal data to third parties</li>
                <li>We do not use your messages for advertising or training AI models</li>
                <li>We do not share your data with data brokers</li>
                <li>We do not display ads</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. Data Storage & Security</h2>
              <p>
                Your data is stored securely using Supabase (backed by PostgreSQL) with encryption at rest and in
                transit. Files are stored in encrypted cloud storage. We use industry-standard security measures
                including TLS encryption, secure authentication, and regular security audits.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Third-Party Services</h2>
              <p className="mb-2">We use the following third-party services to operate Chatterbox:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Supabase:</strong> Database, authentication, and real-time infrastructure</li>
                <li><strong className="text-foreground">Stripe:</strong> Payment processing</li>
                <li><strong className="text-foreground">Daily.co:</strong> Video and audio call infrastructure</li>
                <li><strong className="text-foreground">Resend:</strong> Transactional email delivery</li>
                <li><strong className="text-foreground">Vercel:</strong> Application hosting</li>
                <li><strong className="text-foreground">Cloudflare:</strong> Bot protection (Turnstile)</li>
              </ul>
              <p className="mt-2">Each provider processes data only as necessary to provide their service.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Data Retention</h2>
              <p>
                Messages and files are retained according to your plan (90 days on Free, unlimited on Pro).
                Account data is retained as long as your account is active. When you delete your account, we
                remove your personal data within 30 days, except where retention is required by law.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Access and download your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Export your messages and files</li>
                <li>Object to processing of your data</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at{" "}
                <a href="mailto:hello@georgeholmes.io" className="text-foreground hover:text-primary">
                  hello@georgeholmes.io
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. Cookies</h2>
              <p>
                We use essential cookies for authentication and session management. We do not use tracking cookies
                or third-party advertising cookies.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of material changes via
                email or an in-app notice. Continued use of the Service after changes take effect constitutes
                acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. Contact</h2>
              <p>
                For questions about this Privacy Policy, contact us at{" "}
                <a href="mailto:hello@georgeholmes.io" className="text-foreground hover:text-primary">
                  hello@georgeholmes.io
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
