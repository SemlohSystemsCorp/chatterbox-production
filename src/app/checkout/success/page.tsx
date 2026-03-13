import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Zap, Users, PhoneCall, HardDrive, Clock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoxQuota } from "@/lib/billing";

export const metadata = {
  title: "Upgrade successful",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string }>;
}) {
  const { box: boxSlug } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!boxSlug) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: box } = await admin
    .from("boxes")
    .select("id, name, slug, created_by, color")
    .eq("slug", boxSlug)
    .single();

  if (!box) redirect("/dashboard");

  const quota = await getBoxQuota(box.id);
  const boxColor = box.color || "#635bff";

  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 520, width: "100%", padding: "40px 24px", textAlign: "center" }}>

        {/* Success icon */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "color-mix(in srgb, #10b981 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle2 size={36} color="#10b981" />
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--ds-heading)", margin: "0 0 8px" }}>
          You&apos;re on Pro!
        </h1>
        <p style={{ fontSize: 14, color: "var(--ds-muted)", margin: "0 0 32px", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ds-text)" }}>{box.name}</strong> has been upgraded to{" "}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            color: "var(--ds-primary)",
            fontWeight: 600,
          }}>
            <Zap size={12} />
            Chatterbox Pro
          </span>
        </p>

        {/* What's unlocked card */}
        <div className="card card-body" style={{ textAlign: "left", marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 16 }}>
            What&apos;s unlocked
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: Users, label: "Unlimited members", desc: "Invite your entire team with no seat caps" },
              { icon: PhoneCall, label: "Unlimited call minutes", desc: "Audio & video calls with no time limits" },
              { icon: HardDrive, label: "20 GB storage", desc: "Share files, images, and documents freely" },
              { icon: Clock, label: "Full message history", desc: "Search and access every message, forever" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--ds-primary) 10%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={15} color="var(--ds-primary)" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 12, color: "var(--ds-muted)", margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing summary */}
        <div className="card card-body" style={{ textAlign: "left", marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 12 }}>
            Billing summary
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Plan</span>
              <span style={{ color: "var(--ds-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Zap size={11} /> Pro
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Members</span>
              <span style={{ color: "var(--ds-muted)" }}>{quota.seats.used}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Per seat</span>
              <span style={{ color: "var(--ds-muted)" }}>$8.00/mo</span>
            </div>
            <div style={{
              borderTop: "1px solid var(--ds-border)",
              paddingTop: 8,
              marginTop: 4,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
            }}>
              <span style={{ fontWeight: 600, color: "var(--ds-heading)" }}>Monthly total</span>
              <span style={{ fontWeight: 700, color: "var(--ds-heading)" }}>
                ${(quota.seats.used * 8).toFixed(2)}/mo
              </span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 10 }}>
            A receipt has been sent to your email. You can manage your subscription from workspace settings.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href={`/box/${box.slug}`}
            className="btn btn-primary btn-full"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            Go to {box.name}
            <ArrowRight size={14} />
          </Link>
          <Link
            href={`/box/${box.slug}/settings`}
            className="btn btn-secondary btn-full"
          >
            Workspace settings
          </Link>
        </div>
      </div>
    </div>
  );
}
