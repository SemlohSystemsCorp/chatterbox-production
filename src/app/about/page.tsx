import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "About",
  description:
    "Chatterbox is a fast, clean team messaging app built by George Holmes. Learn more about the product and mission.",
  alternates: { canonical: `${baseUrl}/about` },
  openGraph: { url: `${baseUrl}/about` },
};

export default function AboutPage() {
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="text-xs font-medium text-primary">About Chatterbox</span>
          </div>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Built for teams that actually talk
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Chatterbox started with a simple frustration: most team messaging tools are slow,
            cluttered, and expensive. We set out to build something better.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="pb-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <p className="text-base leading-relaxed">
              Chatterbox is built by a small team based in Chicago, founded by{" "}
              <a
                href="https://georgeholmes.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary"
              >
                George Holmes
              </a>
              . It started with a simple frustration: paying $12+ per seat for a chat tool that
              felt like it was designed in 2015. The goal was straightforward — build the
              messaging app we actually want to use.
            </p>
            <p className="text-base leading-relaxed">
              Channels, threads, DMs, file sharing, and video calls — everything a team needs,
              with nothing it doesn&apos;t. No integrations marketplace, no bot ecosystem to
              manage, no per-feature upsells. Just a fast, clean communication tool.
            </p>
            <p className="text-base leading-relaxed">
              Chatterbox is currently in public beta. It&apos;s free to start and actively
              improved based on user feedback.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">What we care about</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: "Speed first",
                desc: "Every interaction should feel instant. Latency is a feature. Messages deliver in under 50ms.",
              },
              {
                title: "No noise",
                desc: "Notifications should be meaningful. Channels should be easy to scan. The default should be calm.",
              },
              {
                title: "Honest pricing",
                desc: "You should know exactly what you're paying and why. No hidden limits. No gotcha upgrades.",
              },
            ].map((v) => (
              <div key={v.title} className="rounded-xl border border-border bg-background p-6">
                <h3 className="mb-2 font-semibold text-foreground">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-lg px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">Try it for free</h2>
          <p className="mb-6 text-muted-foreground">
            No sales call. No credit card. Set up your team in minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-primary-hover"
          >
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
