import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Bell,
  ChevronRight,
  Hash,
  MessageSquare,
  AtSign,
  ExternalLink,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  // Boxes with created_by so we can derive role
  const { data: boxMemberships } = await supabase
    .from("box_members")
    .select("box_id, joined_at, boxes(id, name, slug, description, icon_url, created_by, color)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const boxes = ((boxMemberships || []) as any[])
    .map((m) => ({
      ...m.boxes,
      joinedAt: m.joined_at,
      role: m.boxes?.created_by === user.id ? "Admin" : "Member",
    }))
    .filter((b) => b.id);

  // Recent notifications (last 6)
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("id, type, body, is_read, created_at, actor_id, channel_id, conversation_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  // Actor names for notifications
  const actorIds = [...new Set((recentNotifs || []).map((n) => n.actor_id).filter((id): id is string => id !== null))];
  const actorMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", actorIds);
    (actors || []).forEach((a: any) => { actorMap[a.id] = a; });
  }

  const firstName = profile?.display_name?.split(" ")[0] || profile?.username || "there";
  const greeting = getGreeting(firstName);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ds-heading)", margin: 0, letterSpacing: "-0.02em" }}>
            {greeting}
          </h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", marginTop: 4 }}>
            {boxes.length === 0
              ? "Create or join a workspace to get started."
              : `You're in ${boxes.length} workspace${boxes.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/join/box" className="btn btn-secondary btn-sm">
            Join workspace
          </Link>
          <Link href="/box/create" className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={13} />
            New workspace
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* ── Left column: workspaces ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", margin: 0 }}>
              Your workspaces
              {boxes.length > 0 && (
                <span style={{ fontWeight: 400, color: "var(--ds-muted)", marginLeft: 6 }}>({boxes.length})</span>
              )}
            </h2>
          </div>

          {boxes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {boxes.map((box) => (
                <BoxCard key={box.id} box={box} />
              ))}
            </div>
          ) : (
            <div style={{
              borderRadius: 12,
              border: "1.5px dashed var(--ds-border)",
              background: "var(--ds-surface)",
              padding: "40px 24px",
              textAlign: "center",
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "color-mix(in srgb, var(--ds-primary) 10%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <MessageSquare size={18} color="var(--ds-primary)" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 4 }}>
                No workspaces yet
              </p>
              <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 16 }}>
                Create a workspace or join one with a code.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Link href="/box/create" className="btn btn-primary btn-sm">Create workspace</Link>
                <Link href="/join/box" className="btn btn-secondary btn-sm">Join with code</Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: notifications ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={13} />
              Notifications
              {(unreadCount || 0) > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: "var(--ds-primary)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "1px 6px",
                  lineHeight: "16px",
                }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            <Link href="/dashboard/notifications" style={{ fontSize: 12, color: "var(--ds-primary)", textDecoration: "none" }}>
              View all
            </Link>
          </div>

          <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, overflow: "hidden" }}>
            {(recentNotifs || []).length > 0 ? (
              <div>
                {(recentNotifs || []).map((notif, i) => {
                  const actor = notif.actor_id ? actorMap[notif.actor_id] : null;
                  const actorName = actor?.display_name?.split(" ")[0] || actor?.username || "Someone";
                  return (
                    <NotifRow
                      key={notif.id}
                      type={notif.type}
                      actorName={actorName}
                      actorAvatar={actor?.avatar_url || null}
                      body={notif.body}
                      isRead={notif.is_read}
                      createdAt={notif.created_at}
                      isLast={i === (recentNotifs || []).length - 1}
                    />
                  );
                })}
                <div style={{ padding: "10px 16px", borderTop: "1px solid var(--ds-border)" }}>
                  <Link href="/dashboard/notifications" style={{ fontSize: 12, color: "var(--ds-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    See all notifications <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <Bell size={20} color="var(--ds-border)" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function getGreeting(firstName: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function BoxCard({ box }: { box: any }) {
  const color = box.color || "#6366f1";
  const initial = box.name[0]?.toUpperCase() || "?";

  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      transition: "box-shadow 0.15s",
    }}>
      {/* Icon */}
      {box.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={box.icon_url}
          alt=""
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}>
          {initial}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {box.name}
          </span>
          <RoleBadge role={box.role} />
        </div>
        {box.description ? (
          <p style={{ fontSize: 12, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {box.description}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--ds-border)" }}>No description</p>
        )}
      </div>

      {/* Open button */}
      <Link
        href={`/box/${box.slug}`}
        className="btn btn-secondary btn-sm"
        style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
      >
        Open
        <ExternalLink size={11} />
      </Link>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "Admin";
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.03em",
      padding: "2px 7px",
      borderRadius: 999,
      background: isAdmin
        ? "color-mix(in srgb, var(--ds-primary) 12%, transparent)"
        : "var(--ds-bg)",
      color: isAdmin ? "var(--ds-primary)" : "var(--ds-muted)",
      border: isAdmin ? "none" : "1px solid var(--ds-border)",
      textTransform: "uppercase" as const,
      flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

function NotifRow({
  type,
  actorName,
  actorAvatar,
  body,
  isRead,
  createdAt,
  isLast,
}: {
  type: string;
  actorName: string;
  actorAvatar: string | null;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  isLast: boolean;
}) {
  const icon = type === "dm"
    ? <MessageSquare size={12} />
    : type === "mention"
    ? <AtSign size={12} />
    : <Hash size={12} />;

  const label = type === "dm"
    ? "sent you a message"
    : type === "mention"
    ? "mentioned you"
    : "replied in a thread";

  return (
    <div style={{
      padding: "10px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--ds-border)",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      background: isRead ? "transparent" : "color-mix(in srgb, var(--ds-primary) 4%, transparent)",
    }}>
      {/* Unread dot */}
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: isRead ? "transparent" : "var(--ds-primary)", marginTop: 5, flexShrink: 0 }} />

      {/* Avatar */}
      {actorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={actorAvatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "var(--ds-bg)",
          border: "1px solid var(--ds-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--ds-muted)",
        }}>
          {icon}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: "var(--ds-text)", marginBottom: 2 }}>
          <strong style={{ fontWeight: 600 }}>{actorName}</strong>{" "}
          <span style={{ color: "var(--ds-muted)" }}>{label}</span>
        </p>
        {body && (
          <p style={{ fontSize: 11, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {body}
          </p>
        )}
      </div>

      {/* Time */}
      <span style={{ fontSize: 11, color: "var(--ds-muted)", flexShrink: 0, marginTop: 1 }}>
        {timeAgo(createdAt)}
      </span>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
