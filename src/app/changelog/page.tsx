import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Changelog",
  description: "See what's new in Chatterbox — product updates, improvements, and bug fixes.",
  alternates: { canonical: `${baseUrl}/changelog` },
  openGraph: { url: `${baseUrl}/changelog` },
};

const ENTRIES = [
  {
    date: "March 2025",
    tag: "Feature",
    title: "Thread attachment support",
    desc: "Files and images shared in thread replies now display inline, with the same square thumbnail treatment as channel messages.",
  },
  {
    date: "March 2025",
    tag: "Improvement",
    title: "Invite flow with channel access",
    desc: "When inviting a team member you can now choose exactly which private channels they join on sign-up. Public channels are always included.",
  },
  {
    date: "February 2025",
    tag: "Feature",
    title: "Invite emails via Resend",
    desc: "Invite emails are now sent automatically with your org name, a personal note, and a one-click join link.",
  },
  {
    date: "February 2025",
    tag: "Feature",
    title: "Video & audio calls",
    desc: "1:1 and group calls powered by Daily.co. Start a call from any channel or DM with one click.",
  },
  {
    date: "January 2025",
    tag: "Launch",
    title: "Public beta",
    desc: "Chatterbox opens to the public. Free for teams up to 20 members.",
  },
];

const TAG_COLORS: Record<string, string> = {
  Feature: "bg-primary/10 text-primary",
  Improvement: "bg-[#3ecf8e]/10 text-[#3ecf8e]",
  Fix: "bg-orange-100 text-orange-600",
  Launch: "bg-[#635bff]/10 text-[#635bff]",
};

export default function ChangelogPage() {
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
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">Changelog</h1>
          <p className="text-lg text-muted-foreground">
            What&apos;s new in Chatterbox — features, improvements, and fixes.
          </p>
        </div>
      </section>

      {/* Entries */}
      <section className="pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="space-y-10">
            {ENTRIES.map((entry) => (
              <div key={entry.title} className="relative border-l-2 border-border pl-6">
                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-border" />
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      TAG_COLORS[entry.tag] ?? "bg-muted text-foreground"
                    }`}
                  >
                    {entry.tag}
                  </span>
                </div>
                <h2 className="mb-1 text-base font-semibold text-foreground">{entry.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{entry.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Roadmap</h2>
          <div className="space-y-3">
            {[
              { title: "Native iOS & Android apps", status: "Planned" },
              { title: "Slack import", status: "Planned" },
              { title: "Message search", status: "In progress" },
              { title: "Custom emoji", status: "Planned" },
              { title: "Message scheduling", status: "Planned" },
              { title: "API & webhooks", status: "Planned" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-5 py-3.5"
              >
                <span className="text-sm text-foreground">{item.title}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    item.status === "In progress"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Have a feature request?{" "}
            <a href="mailto:hello@georgeholmes.io" className="text-foreground hover:text-primary">
              Let us know
            </a>
            .
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
