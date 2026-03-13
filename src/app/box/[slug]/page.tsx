import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hash } from "lucide-react";

export default async function BoxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/");

  const { data: channel } = await supabase
    .from("channels")
    .select("slug")
    .eq("box_id", box.id)
    .eq("is_archived", false)
    .order("name")
    .limit(1)
    .single();

  if (channel) {
    redirect(`/box/${slug}/c/${channel.slug}`);
  }

  // No channels yet — show a helpful empty state
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "color-mix(in srgb, var(--ds-primary) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Hash size={24} color="var(--ds-primary)" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ds-heading)", margin: "0 0 8px" }}>
          No channels yet
        </h2>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", lineHeight: 1.6, margin: 0 }}>
          This workspace doesn&apos;t have any channels yet. Use the{" "}
          <strong style={{ color: "var(--ds-text)" }}>+ Channels</strong> button in the sidebar to create your first one.
        </p>
      </div>
    </div>
  );
}
