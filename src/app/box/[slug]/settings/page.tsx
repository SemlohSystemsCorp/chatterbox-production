import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hash, Lock, AlertTriangle, Zap, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBoxQuota } from "@/lib/billing";
import { updateBox, updateBoxColor, removeBoxMember } from "./actions";
import { DangerBox } from "./danger-box";
import { InviteCode } from "./invite-code";

const WORKSPACE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

export default async function BoxSettingsPage({
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
    .select("id, name, slug, description, created_by, color")
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

  const [{ data: channels }, { data: boxMembers }] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, slug, is_private, is_archived")
      .eq("box_id", box.id)
      .order("name"),
    supabase
      .from("box_members")
      .select("user_id, joined_at, profiles(display_name, username, avatar_url)")
      .eq("box_id", box.id)
      .order("joined_at"),
  ]);

  const quota = await getBoxQuota(box.id);

  const activeChannels = (channels || []).filter((c) => !c.is_archived);
  const archivedChannels = (channels || []).filter((c) => c.is_archived);
  const members = (boxMembers || []) as any[];
  const boxColor = (box as any).color || "#6366f1";

  return (
    <div style={{ height: "100vh", background: "var(--ds-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ds-border)", background: "var(--ds-surface)", flexShrink: 0 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 24px" }}>
          <Link
            href={`/box/${slug}`}
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
            {box.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: boxColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}>
              {box.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--ds-heading)", margin: 0 }}>
                {box.name}
              </h1>
              <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 1 }}>
                Workspace settings · {isOwner ? "Owner" : "Member"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── General ── */}
        <section className="card card-body">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 16 }}>General</h2>
          <form action={updateBox} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="hidden" name="boxId" value={box.id} />
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="name">Workspace name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="input"
                defaultValue={box.name}
                required
                maxLength={50}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="description">
                Description
                <span style={{ fontWeight: 400, color: "var(--ds-muted)", marginLeft: 4 }}>(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={box.description ?? ""}
                rows={3}
                placeholder="What's this workspace for?"
                className="input"
                style={{ resize: "vertical", minHeight: 72 }}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary btn-sm">Save changes</button>
            </div>
          </form>
        </section>

        {/* ── Color ── */}
        {isOwner && (
          <section className="card card-body">
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 12 }}>Workspace color</h2>
            <form action={updateBoxColor}>
              <input type="hidden" name="boxId" value={box.id} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {WORKSPACE_COLORS.map((c) => (
                  <label
                    key={c}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: boxColor === c ? "2px solid var(--ds-text)" : "2px solid transparent",
                      outline: boxColor === c ? "2px solid var(--ds-bg)" : "none",
                      outlineOffset: "-4px",
                      flexShrink: 0,
                    }}
                  >
                    <input type="radio" name="color" value={c} defaultChecked={boxColor === c} style={{ display: "none" }} />
                    {boxColor === c && <Check size={14} color="#fff" strokeWidth={3} />}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn btn-secondary btn-sm">Update color</button>
            </form>
          </section>
        )}

        {/* ── Invite code ── */}
        <section className="card card-body">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 6 }}>Invite code</h2>
          <p style={{ fontSize: 12, color: "var(--ds-muted)", marginBottom: 12 }}>
            Share this code with people you want to invite. They can join at{" "}
            <strong>chatterbox.app/join</strong>.
          </p>
          <InviteCode code={box.slug} />
        </section>

        {/* ── Members ── */}
        <section className="card card-body">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 14 }}>
            Members
            <span style={{ fontWeight: 400, color: "var(--ds-muted)", marginLeft: 6 }}>({members.length})</span>
          </h2>

          {members.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {members.map((m, i) => {
                const profile = m.profiles as any;
                const name = profile?.display_name || profile?.username || "Unknown";
                const isThisOwner = m.user_id === box.created_by;
                const isMe = m.user_id === user.id;
                const role = isThisOwner ? "Owner" : "Member";
                return (
                  <div
                    key={m.user_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: i < members.length - 1 ? "1px solid var(--ds-border)" : "none",
                    }}
                  >
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "color-mix(in srgb, var(--ds-primary) 12%, transparent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ds-primary)",
                          flexShrink: 0,
                        }}
                      >
                        {name[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{name}</span>
                        {isMe && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--ds-bg)",
                            border: "1px solid var(--ds-border)",
                            color: "var(--ds-muted)",
                            letterSpacing: "0.03em",
                            textTransform: "uppercase" as const,
                          }}>
                            You
                          </span>
                        )}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 999,
                          background: isThisOwner
                            ? "color-mix(in srgb, var(--ds-primary) 12%, transparent)"
                            : "var(--ds-bg)",
                          color: isThisOwner ? "var(--ds-primary)" : "var(--ds-muted)",
                          border: isThisOwner ? "none" : "1px solid var(--ds-border)",
                          letterSpacing: "0.03em",
                          textTransform: "uppercase" as const,
                        }}>
                          {role}
                        </span>
                      </div>
                      {profile?.username && (
                        <span style={{ fontSize: 12, color: "var(--ds-muted)" }}>
                          @{profile.username}
                        </span>
                      )}
                    </div>
                    {isOwner && !isMe && !isThisOwner && (
                      <form action={removeBoxMember}>
                        <input type="hidden" name="boxId" value={box.id} />
                        <input type="hidden" name="userId" value={m.user_id} />
                        <button
                          type="submit"
                          className="btn btn-sm"
                          style={{
                            background: "transparent",
                            border: "1px solid var(--ds-border)",
                            color: "var(--ds-muted)",
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>No members found.</p>
          )}
        </section>

        {/* ── Channels ── */}
        <section className="card card-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", margin: 0 }}>
              Channels
              <span style={{ fontWeight: 400, color: "var(--ds-muted)", marginLeft: 6 }}>
                ({activeChannels.length})
              </span>
            </h2>
          </div>

          {activeChannels.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeChannels.map((ch, i) => (
                <div
                  key={ch.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < activeChannels.length - 1 ? "1px solid var(--ds-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--ds-bg)",
                      border: "1px solid var(--ds-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {ch.is_private ? (
                      <Lock size={12} color="var(--ds-muted)" />
                    ) : (
                      <Hash size={12} color="var(--ds-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{ch.name}</span>
                    {ch.is_private && (
                      <span style={{ fontSize: 11, color: "var(--ds-muted)", marginLeft: 6 }}>Private</span>
                    )}
                  </div>
                  <Link
                    href={`/box/${slug}/c/${ch.slug}`}
                    style={{ fontSize: 12, color: "var(--ds-primary)", textDecoration: "none" }}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>No active channels.</p>
          )}

          {archivedChannels.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ds-border)" }}>
              <p style={{ fontSize: 12, color: "var(--ds-muted)", marginBottom: 8 }}>
                Archived ({archivedChannels.length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {archivedChannels.map((ch) => (
                  <span
                    key={ch.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "var(--ds-muted)",
                      background: "var(--ds-bg)",
                      border: "1px solid var(--ds-border)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      textDecoration: "line-through",
                    }}
                  >
                    <Hash size={9} />
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Billing ── */}
        <section className="card card-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", margin: 0 }}>Billing</h2>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 999,
              background: quota.plan === "pro"
                ? "color-mix(in srgb, var(--ds-primary) 12%, transparent)"
                : "var(--ds-bg)",
              color: quota.plan === "pro" ? "var(--ds-primary)" : "var(--ds-muted)",
              border: quota.plan === "pro" ? "none" : "1px solid var(--ds-border)",
            }}>
              {quota.plan === "pro" && <Zap size={10} />}
              {quota.plan === "pro" ? "Pro" : "Free"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Members</span>
              <span style={{ color: "var(--ds-muted)" }}>{quota.seats.used} / {quota.seats.limit ?? "∞"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Call minutes (this month)</span>
              <span style={{ color: "var(--ds-muted)" }}>{quota.callMinutes.used.toLocaleString()} / {quota.callMinutes.limit?.toLocaleString() ?? "∞"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ds-text)" }}>Storage</span>
              <span style={{ color: "var(--ds-muted)" }}>{Math.round(quota.storage.usedBytes / (1024 * 1024))} MB / {quota.storage.limitBytes ? `${Math.round(quota.storage.limitBytes / (1024 * 1024))} MB` : "∞"}</span>
            </div>
          </div>
          {isOwner && (
            <Link href={`/box/${slug}/upgrade`} className="btn btn-secondary btn-sm">
              {quota.plan === "pro" ? "Manage billing" : "Upgrade to Pro"}
            </Link>
          )}
        </section>

        {/* ── Danger zone ── */}
        <section
          style={{
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
            background: "color-mix(in srgb, #ef4444 4%, transparent)",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={14} color="#ef4444" />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", margin: 0 }}>
              Danger zone
            </h2>
          </div>
          <DangerBox
            boxId={box.id}
            boxName={box.name}
            boxSlug={box.slug}
            isOwner={isOwner}
          />
        </section>

      </div>
      </div>
    </div>
  );
}
