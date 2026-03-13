import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HeroAnimation } from "@/components/marketing/hero-animation";
import { MarketingFooter } from "@/components/marketing/footer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  title: "Chatterbox — Fast, Clean Team Communication",
  description:
    "Chatterbox is a modern Slack alternative with real-time messaging, channels, threads, direct messages, file sharing, and video calls. Free to start.",
  alternates: { canonical: baseUrl },
  openGraph: {
    url: baseUrl,
    title: "Chatterbox — Fast, Clean Team Communication",
    description:
      "Modern team messaging with channels, threads, DMs, file sharing, and video calls. The Slack alternative built for speed and clarity.",
  },
  twitter: {
    title: "Chatterbox — Fast, Clean Team Communication",
    description:
      "Modern team messaging with channels, threads, DMs, file sharing, and video calls. Free to start.",
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

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let boxSlug: string | null = null;
  if (user) {
    const { data: membership } = await supabase
      .from("box_members")
      .select("box_id, boxes(slug)")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    boxSlug = (membership as any)?.boxes?.slug ?? null;
  }

  const appHref = boxSlug ? `/box/${boxSlug}` : user ? "/onboarding" : "/signup";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Chatterbox",
        description: "Fast, clean team communication with channels, threads, DMs, and video.",
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Chatterbox",
        url: baseUrl,
        logo: { "@type": "ImageObject", url: `${baseUrl}/icon.svg` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#app`,
        name: "Chatterbox",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: baseUrl,
        offers: [
          { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free plan" },
          { "@type": "Offer", price: "8", priceCurrency: "USD", name: "Pro plan" },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-background font-sans">
        {/* Nav */}
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-foreground">
              <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
              Chatterbox
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/#features"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
            </div>
            <div className="flex items-center gap-1">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={appHref}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
                  >
                    Open app
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
                  >
                    Get started
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-28">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_40%,rgba(99,91,255,0.07),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
              {/* Left */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-primary">Now in public beta</span>
                </div>
                <h1 className="mb-5 text-[2.75rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.2rem]">
                  The messaging app
                  <br />
                  your team will
                  <br />
                  <span className="text-primary">actually use</span>
                </h1>
                <p className="mb-8 max-w-md text-lg leading-relaxed text-muted-foreground">
                  Channels, threads, DMs, and video calls — all in one fast, clean interface. No
                  bloat. No noise. Just communication that works.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={user ? appHref : "/signup"}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg"
                  >
                    {user ? "Open your workspace" : "Get started free"}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-6 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    View pricing
                  </Link>
                </div>
                {!user && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Free up to 20 members. No credit card required.
                  </p>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {["Real-time messaging", "Video & audio calls", "Threaded discussions"].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckIcon />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: animated illustration */}
              <div className="flex justify-center lg:justify-end">
                <HeroAnimation />
              </div>
            </div>
          </div>
        </section>

        {/* Social proof strip */}
        <section className="border-y border-border/60 bg-muted/30 py-10">
          <div className="mx-auto max-w-4xl px-6">
            <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Built for modern teams
            </p>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {[
                { stat: "< 50ms", label: "Message delivery" },
                { stat: "99.9%", label: "Uptime SLA" },
                { stat: "∞", label: "Message history on Pro" },
                { stat: "0", label: "Vendor lock-in" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="mb-1 text-2xl font-bold text-foreground">{s.stat}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground">Everything your team needs</h2>
              <p className="mx-auto max-w-md text-muted-foreground">
                Built for speed. Designed for clarity. No integrations required to get started.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  ),
                  title: "Channels & Threads",
                  desc: "Keep conversations organized. Reply in threads to keep channels clean and on-topic.",
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  ),
                  title: "Direct Messages",
                  desc: "1:1 and group DMs for quick side conversations. Create group threads on the fly.",
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: "Real-time Everything",
                  desc: "Messages, reactions, and presence updates appear instantly across all devices.",
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: "Video & Audio Calls",
                  desc: "Jump into a call without leaving the app. 1:1 and group calls with screen sharing.",
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  ),
                  title: "File Sharing",
                  desc: "Drag and drop files into any channel or DM. Preview images and docs inline.",
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  ),
                  title: "Smart Notifications",
                  desc: "@mentions, thread replies, and DMs surface what matters. Mute what doesn't.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-background p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted/30 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground">Up and running in minutes</h2>
              <p className="text-muted-foreground">No setup call required.</p>
            </div>
            <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create your org",
                  desc: "Sign up and create an organization for your team. Give it a name and invite your first members.",
                },
                {
                  step: "02",
                  title: "Set up channels",
                  desc: "Create channels for teams, projects, or topics. Public channels are open; private channels are invite-only.",
                },
                {
                  step: "03",
                  title: "Start talking",
                  desc: "Send messages, start threads, share files, and jump into a video call — all from one place.",
                },
              ].map((s, i) => (
                <div key={s.step} className="relative flex flex-col items-start">
                  {i < 2 && (
                    <div className="absolute top-5 left-[calc(100%_+_16px)] hidden h-px w-[calc(100%_-_32px)] border-t border-dashed border-border sm:block" />
                  )}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {s.step}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground">Teams love Chatterbox</h2>
              <p className="text-muted-foreground">Fast, focused, and actually enjoyable to use.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                {
                  quote:
                    "We switched from Slack six months ago and haven't looked back. The interface is so much cleaner and our team actually reads channels now.",
                  name: "Jordan M.",
                  role: "CTO, early-stage startup",
                },
                {
                  quote:
                    "The thread system is exactly what I wanted. Side conversations happen in threads instead of cluttering the channel. Game-changer for async teams.",
                  name: "Priya S.",
                  role: "Engineering Manager",
                },
                {
                  quote:
                    "Video calls built-in means one less tab open. Setup took under 10 minutes for our whole team.",
                  name: "Marcus T.",
                  role: "Head of Product",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="flex flex-col rounded-xl border border-border bg-background p-6 shadow-sm"
                >
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-foreground/80">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="bg-muted/30 py-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-10 text-center">
              <h2 className="mb-2 text-3xl font-bold text-foreground">Simple, transparent pricing</h2>
              <p className="text-muted-foreground">Start free. Upgrade when your team needs more.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col rounded-xl border border-border bg-background p-6 shadow-sm">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Free</p>
                <p className="mb-1 text-3xl font-bold text-foreground">$0</p>
                <p className="mb-6 text-sm text-muted-foreground">Up to 20 members</p>
                <ul className="mb-6 flex-1 space-y-2.5">
                  {["20 seats per org", "90-day message history", "1 GB file storage", "5,000 call minutes/month"].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                        <CheckIcon />
                        {f}
                      </li>
                    )
                  )}
                </ul>
                <Link
                  href="/signup"
                  className="block w-full rounded-md border border-border py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Get started free
                </Link>
              </div>
              <div className="relative flex flex-col rounded-xl border-2 border-primary bg-background p-6 shadow-md">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Most popular
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium text-primary">Pro</p>
                <p className="mb-1 text-3xl font-bold text-foreground">
                  $8
                  <span className="text-lg font-normal text-muted-foreground">/seat/mo</span>
                </p>
                <p className="mb-6 text-sm text-muted-foreground">Unlimited members</p>
                <ul className="mb-6 flex-1 space-y-2.5">
                  {["Unlimited seats", "Unlimited message history", "20 GB file storage", "Unlimited calls"].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                        <CheckIcon />
                        {f}
                      </li>
                    )
                  )}
                </ul>
                <Link
                  href="/signup"
                  className="block w-full rounded-md bg-primary py-2 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
                >
                  Start Pro trial
                </Link>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/pricing" className="text-primary hover:underline">
                See full feature comparison →
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24">
          <div className="mx-auto max-w-2xl px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  q: "How is Chatterbox different from Slack?",
                  a: "Chatterbox is faster, cleaner, and cheaper. We've stripped out the noise and focused on what teams actually use: channels, threads, DMs, and video calls. No app directory required.",
                },
                {
                  q: "Can I migrate my history from Slack?",
                  a: "We're working on a Slack import tool. In the meantime, your team can get started fresh — most teams find a clean break is actually a good thing.",
                },
                {
                  q: "Is there a mobile app?",
                  a: "The web app is fully mobile-optimized and installable as a PWA. Native iOS and Android apps are on the roadmap.",
                },
                {
                  q: "What happens when I hit the free plan limits?",
                  a: "You'll be prompted to upgrade to Pro. Your messages and files are never deleted — you just can't send new ones until you upgrade or free up space.",
                },
                {
                  q: "How does billing work for Pro?",
                  a: "Pro is billed per active seat, per month. Add and remove members anytime — billing adjusts automatically at the end of each billing period.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-border bg-background px-5 py-4"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium text-foreground marker:hidden list-none">
                    {item.q}
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1a1f36] py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">Ready to get started?</h2>
            <p className="mb-8 text-lg text-[#697386]">
              Create your org in seconds. Free for up to 20 members.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={user ? appHref : "/signup"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-hover hover:shadow-xl"
              >
                {user ? "Go to your workspace" : "Create your org free"}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-white/20 px-8 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/30">No credit card required.</p>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
