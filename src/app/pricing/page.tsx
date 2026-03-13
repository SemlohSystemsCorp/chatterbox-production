import Link from "next/link";
import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for teams of all sizes. Start free, upgrade when you need more. $8 per seat/month for Pro.",
  keywords: [
    "chatterbox pricing",
    "team chat pricing",
    "slack alternative pricing",
    "free team messaging",
    "business communication cost",
  ],
  alternates: {
    canonical: `${baseUrl}/pricing`,
  },
  openGraph: {
    url: `${baseUrl}/pricing`,
    title: "Pricing — Chatterbox",
    description:
      "Simple, transparent pricing for teams of all sizes. Start free, upgrade when you need more.",
  },
  twitter: {
    title: "Pricing — Chatterbox",
    description:
      "Simple, transparent pricing. Free plan available, Pro at $8/seat/month.",
  },
};

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 text-[#3ecf8e]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 text-[#c4cdd8]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

const features: {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}[] = [
  { label: "Seats per org", free: "Up to 20", pro: "Unlimited" },
  { label: "Orgs per user", free: "2", pro: "2" },
  { label: "Message history", free: "90 days", pro: "Unlimited" },
  { label: "File storage", free: "1 GB", pro: "20 GB" },
  { label: "Channels", free: "Unlimited", pro: "Unlimited" },
  { label: "Direct messages", free: true, pro: true },
  { label: "Threads", free: true, pro: true },
  { label: "Reactions & emoji", free: true, pro: true },
  { label: "File sharing", free: true, pro: true },
  { label: "Message search", free: "Last 90 days", pro: "Full history" },
  {
    label: "Video & audio calls",
    free: "5,000 min/month",
    pro: "Unlimited",
  },
  { label: "Screen sharing", free: true, pro: true },
  { label: "Guest access", free: false, pro: true },
  { label: "Priority support", free: false, pro: true },
  { label: "Admin controls", free: false, pro: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <XIcon />;
  return (
    <span className="text-sm font-medium text-foreground">{value}</span>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-foreground"
          >
            <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
            Chatterbox
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/pricing"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5851ea]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pb-16 pt-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade your org when you need more seats, storage, or
            call time.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-border bg-background p-8 shadow-sm">
              <div className="mb-6">
                <p className="mb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Free
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forever free for small teams
                </p>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {[
                  "Up to 20 seats",
                  "90-day message history",
                  "1 GB file storage",
                  "5,000 call minutes/month",
                  "Unlimited channels & DMs",
                  "Threads & reactions",
                  "File sharing",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full rounded-lg border border-border py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-background p-8 shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow">
                  Most popular
                </span>
              </div>
              <div className="mb-6">
                <p className="mb-1 text-sm font-medium uppercase tracking-wide text-primary">
                  Pro
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">$8</span>
                  <span className="text-base text-muted-foreground">
                    /seat/month
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Billed monthly per active seat
                </p>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {[
                  "Unlimited seats",
                  "Unlimited message history",
                  "20 GB file storage",
                  "Unlimited video & audio calls",
                  "Guest access",
                  "Priority support",
                  "Admin controls",
                  "Full search history",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5851ea]"
              >
                Start with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-8 text-center text-xl font-bold text-foreground">
            Full feature comparison
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-3 border-b border-border bg-muted/60 px-6 py-3">
              <div className="text-sm font-medium text-muted-foreground">
                Feature
              </div>
              <div className="text-center text-sm font-semibold text-foreground">
                Free
              </div>
              <div className="text-center text-sm font-semibold text-primary">
                Pro
              </div>
            </div>
            {/* Rows */}
            {features.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 items-center px-6 py-3.5 ${
                  i < features.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="text-sm text-foreground">{row.label}</div>
                <div className="flex justify-center">
                  <FeatureValue value={row.free} />
                </div>
                <div className="flex justify-center">
                  <FeatureValue value={row.pro} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-center text-xl font-bold text-foreground">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "How does per-seat billing work?",
                a: "You're billed $8/month for each active member in your org. Org admins manage billing. If you remove a member, you'll stop being charged for them at the next billing cycle.",
              },
              {
                q: "Can I be in multiple orgs?",
                a: "Yes — each user can be a member of up to 2 orgs. Billing is per org, not per user, so you won't be double-charged for being in two orgs.",
              },
              {
                q: "What happens when I hit the free tier limits?",
                a: "Message history older than 90 days becomes inaccessible (but is not deleted). Once you hit 20 seats, new members can't join until you upgrade or remove existing members.",
              },
              {
                q: "What counts as a call minute?",
                a: "A call minute is one minute for one participant. A 10-minute call with 3 people uses 30 minutes. Free orgs get 5,000 minutes per month, which resets on the 1st of each month.",
              },
              {
                q: "Can I switch plans at any time?",
                a: "Yes. Upgrading takes effect immediately. Downgrading takes effect at the end of your current billing period.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="mb-2 font-semibold text-foreground">{q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1a1f36] py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Start free today
          </h2>
          <p className="mb-8 text-[#697386]">
            No credit card required. Upgrade anytime.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#5851ea] hover:shadow-xl"
          >
            Create your org
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            Chatterbox
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-foreground"
            >
              Sign up
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Chatterbox
          </p>
        </div>
      </footer>
    </div>
  );
}
