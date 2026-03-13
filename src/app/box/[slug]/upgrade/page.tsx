import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Zap, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBoxQuota } from "@/lib/billing";

const PRICE_PER_SEAT = 8; // $8/seat/month

export default async function UpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, created_by")
    .eq("slug", slug)
    .single();

  if (!box) notFound();

  const { data: membership } = await supabase
    .from("box_members")
    .select("id")
    .eq("box_id", box.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const isOwner = box.created_by === user.id;
  const quota = await getBoxQuota(box.id);

  const memberCount = quota.seats.used;
  const monthlyTotal = memberCount * PRICE_PER_SEAT;

  const storageUsedMb = Math.round(quota.storage.usedBytes / (1024 * 1024));
  const storageLimitMb = quota.storage.limitBytes
    ? Math.round(quota.storage.limitBytes / (1024 * 1024))
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-bg)" }}>
      <div style={{ borderBottom: "1px solid var(--ds-border)", background: "var(--ds-surface)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 24px" }}>
          <Link
            href={`/box/${slug}/settings`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--ds-muted)",
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={13} />
            Settings
          </Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)", margin: 0 }}>
            Upgrade {box.name}
          </h1>
          <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
            Current plan: <strong style={{ color: "var(--ds-text)" }}>{quota.plan === "pro" ? "Pro" : "Free"}</strong>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Current usage */}
        <section className="card card-body">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 14 }}>
            Current usage
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--ds-text)" }}>Members</span>
              <span style={{ fontSize: 13, color: "var(--ds-muted)" }}>
                {quota.seats.used} / {quota.seats.limit ?? "∞"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--ds-text)" }}>Call minutes this month</span>
              <span style={{ fontSize: 13, color: "var(--ds-muted)" }}>
                {quota.callMinutes.used.toLocaleString()} / {quota.callMinutes.limit?.toLocaleString() ?? "∞"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--ds-text)" }}>Storage</span>
              <span style={{ fontSize: 13, color: "var(--ds-muted)" }}>
                {storageUsedMb} MB / {storageLimitMb ? `${storageLimitMb} MB` : "∞"}
              </span>
            </div>
          </div>
        </section>

        {quota.plan === "pro" ? (
          <section className="card card-body" style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "color-mix(in srgb, var(--ds-primary) 12%, transparent)",
                color: "var(--ds-primary)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
              }}>
                <Zap size={11} />
                Pro plan active
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 16 }}>
              You&apos;re on the Pro plan. Manage your subscription below.
            </p>
            {isOwner && (
              <a
                href={`/api/billing/portal?boxSlug=${slug}`}
                className="btn btn-secondary btn-sm"
              >
                Manage billing
              </a>
            )}
          </section>
        ) : (
          <>
            {/* Upgrade card */}
            <section className="card card-body">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Zap size={16} color="var(--ds-primary)" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ds-heading)", margin: 0 }}>
                  Chatterbox Pro
                </h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 20 }}>
                Unlimited seats, calls, and storage for your whole team.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                  "Unlimited members",
                  "Unlimited call minutes",
                  "20 GB file storage",
                  "Full message history",
                  "Priority support",
                ].map((feature) => (
                  <div key={feature} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={14} color="var(--ds-primary)" />
                    <span style={{ fontSize: 13, color: "var(--ds-text)" }}>{feature}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing breakdown */}
            <section className="card card-body">
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 14 }}>
                Your price
              </h2>

              <div style={{
                background: "var(--ds-bg)",
                borderRadius: 10,
                border: "1px solid var(--ds-border)",
                padding: 16,
                marginBottom: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={14} color="var(--ds-muted)" />
                    <span style={{ fontSize: 13, color: "var(--ds-text)" }}>
                      {memberCount} {memberCount === 1 ? "member" : "members"} × ${PRICE_PER_SEAT}/mo
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ds-text)", fontWeight: 500 }}>
                    ${monthlyTotal.toFixed(2)}
                  </span>
                </div>

                <div style={{
                  borderTop: "1px solid var(--ds-border)",
                  paddingTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)" }}>
                    Monthly total
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--ds-heading)" }}>
                    ${monthlyTotal.toFixed(2)}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ds-muted)" }}>/mo</span>
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "var(--ds-muted)", marginBottom: 16 }}>
                Billed monthly based on your current member count. Price adjusts automatically as members join or leave.
              </p>

              {isOwner ? (
                <a
                  href={`/api/billing/checkout?boxSlug=${slug}`}
                  className="btn btn-primary btn-full"
                >
                  Upgrade to Pro — ${monthlyTotal.toFixed(2)}/mo
                </a>
              ) : (
                <p style={{ fontSize: 13, color: "var(--ds-muted)", textAlign: "center" }}>
                  Only the workspace owner can upgrade.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
