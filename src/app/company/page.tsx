import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Company",
  description:
    "Learn about Chatterbox — who we are, what we're building, and how to get in touch.",
  alternates: { canonical: `${baseUrl}/company` },
  openGraph: { url: `${baseUrl}/company` },
};

export default function CompanyPage() {
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

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Company
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Chatterbox is an independent software product built and maintained by George Holmes.
          </p>
        </div>
      </section>

      {/* Info grid */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                label: "Founded",
                value: "2024",
              },
              {
                label: "Headquarters",
                value: "Chicago, IL",
              },
              {
                label: "Team size",
                value: "3",
              },
              {
                label: "Status",
                value: "Public beta",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background p-6">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-lg font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Get in touch</h2>
          <div className="space-y-4">
            {[
              {
                label: "General enquiries",
                value: "hello@georgeholmes.io",
                href: "mailto:hello@georgeholmes.io",
              },
              {
                label: "Support",
                value: "hello@georgeholmes.io",
                href: "mailto:hello@georgeholmes.io",
              },
              {
                label: "Twitter / X",
                value: "@georgeholmesio",
                href: "https://x.com/georgeholmesio",
              },
            ].map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-xl border border-border bg-background px-5 py-4">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  {c.value}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">Careers</h2>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            We&apos;re a small team of three based in Chicago. If you&apos;re interested in
            joining or partnering, reach out at{" "}
            <a href="mailto:hello@georgeholmes.io" className="text-foreground hover:text-primary">
              hello@georgeholmes.io
            </a>
            .
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
