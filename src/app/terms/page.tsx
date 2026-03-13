import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Chatterbox Terms of Service — the rules and guidelines that govern your use of our platform.",
  alternates: { canonical: `${baseUrl}/terms` },
  openGraph: { url: `${baseUrl}/terms` },
};

export default function TermsPage() {
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
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 13, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Chatterbox (&quot;the Service&quot;), you agree to be bound by these Terms of
                Service. If you do not agree to these terms, do not use the Service. These terms apply to all
                users, including visitors, registered users, and organizations.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. Description of Service</h2>
              <p>
                Chatterbox is a team communication platform that provides real-time messaging, channels, threads,
                direct messages, file sharing, and video/audio calls. The Service is provided on a free and paid
                subscription basis.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. Accounts & Registration</h2>
              <p>
                You must provide accurate and complete information when creating an account. You are responsible for
                maintaining the security of your account credentials and for all activity that occurs under your
                account. You must notify us immediately of any unauthorized use.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. Acceptable Use</h2>
              <p className="mb-2">You agree not to use the Service to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit spam, malware, or harmful content</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Infringe on intellectual property rights</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the integrity of the Service</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Organizations & Billing</h2>
              <p>
                Organizations are the billing entity in Chatterbox. Each user may create up to 3 organizations.
                Paid plans are billed per active seat on a monthly basis. You may cancel at any time; access
                continues until the end of the current billing period. Refunds are not provided for partial months.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Content & Data</h2>
              <p>
                You retain ownership of all content you upload or transmit through the Service. By using
                Chatterbox, you grant us a limited license to store, process, and deliver your content as necessary
                to operate the Service. We do not sell your data or use it for advertising purposes.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Service Availability</h2>
              <p>
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. The Service may be
                temporarily unavailable for maintenance, updates, or circumstances beyond our control. We will
                provide reasonable notice for planned downtime when possible.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. Termination</h2>
              <p>
                We may suspend or terminate your access to the Service at any time for violations of these terms
                or for any other reason at our discretion. You may delete your account at any time through your
                account settings. Upon termination, your right to use the Service ceases immediately.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Chatterbox shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages arising out of or related to your use of
                the Service. Our total liability shall not exceed the amount you paid us in the 12 months
                preceding the claim.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. Changes to Terms</h2>
              <p>
                We may update these terms from time to time. We will notify users of material changes via email or
                an in-app notice. Continued use of the Service after changes take effect constitutes acceptance of
                the revised terms.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">11. Contact</h2>
              <p>
                If you have questions about these terms, please contact us at{" "}
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
