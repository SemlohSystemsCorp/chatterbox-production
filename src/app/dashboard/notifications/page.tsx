import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Hash, MessageSquare, AtSign, CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "./actions";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, type, body, is_read, created_at, actor_id, channel_id, conversation_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  // Fetch actor profiles
  const actorIds = [...new Set((notifs || []).map((n) => n.actor_id).filter(Boolean))];
  const actorMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", actorIds);
    (actors || []).forEach((a: any) => { actorMap[a.id] = a; });
  }

  const grouped = groupByDate(notifs || []);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <Link
            href="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--ds-muted)", textDecoration: "none", marginBottom: 6 }}
          >
            <ArrowLeft size={13} />
            Dashboard
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--ds-heading)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} />
            Notifications
            {(unreadCount || 0) > 0 && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                background: "var(--ds-primary)",
                color: "#fff",
                borderRadius: 999,
                padding: "2px 8px",
              }}>
                {unreadCount} unread
              </span>
            )}
          </h1>
        </div>

        {(unreadCount || 0) > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </form>
        )}
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div style={{
          background: "var(--ds-surface)",
          border: "1px solid var(--ds-border)",
          borderRadius: 12,
          padding: "48px 24px",
          textAlign: "center",
        }}>
          <Bell size={28} color="var(--ds-border)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 4 }}>
            All caught up
          </p>
          <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>
            You&apos;ll see notifications here when someone messages or mentions you.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--ds-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                {label}
              </p>
              <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, overflow: "hidden" }}>
                {items.map((notif, i) => {
                  const actor = notif.actor_id ? actorMap[notif.actor_id] : null;
                  const actorName = actor?.display_name?.split(" ")[0] || actor?.username || "Someone";
                  return (
                    <NotifItem
                      key={notif.id}
                      type={notif.type}
                      actorName={actorName}
                      actorInitial={(actorName)[0].toUpperCase()}
                      actorAvatar={actor?.avatar_url || null}
                      body={notif.body}
                      isRead={notif.is_read}
                      createdAt={notif.created_at}
                      isLast={i === items.length - 1}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotifItem({
  type,
  actorName,
  actorInitial,
  actorAvatar,
  body,
  isRead,
  createdAt,
  isLast,
}: {
  type: string;
  actorName: string;
  actorInitial: string;
  actorAvatar: string | null;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  isLast: boolean;
}) {
  const typeIcon = type === "dm"
    ? <MessageSquare size={13} />
    : type === "mention"
    ? <AtSign size={13} />
    : <Hash size={13} />;

  const typeLabel = type === "dm"
    ? "sent you a message"
    : type === "mention"
    ? "mentioned you"
    : "replied in a thread";

  const typeColor = type === "mention" ? "var(--ds-primary)" : "var(--ds-muted)";

  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--ds-border)",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      background: isRead ? "transparent" : "color-mix(in srgb, var(--ds-primary) 4%, transparent)",
    }}>
      {/* Unread dot */}
      <div style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: isRead ? "transparent" : "var(--ds-primary)",
        marginTop: 6,
        flexShrink: 0,
      }} />

      {/* Avatar */}
      {actorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={actorAvatar}
          alt=""
          style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "color-mix(in srgb, var(--ds-primary) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--ds-primary)",
          flexShrink: 0,
        }}>
          {actorInitial}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: typeColor, fontWeight: 500 }}>
            {typeIcon}
            {type === "dm" ? "Direct message" : type === "mention" ? "Mention" : "Thread reply"}
          </span>
          <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>·</span>
          <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>{timeAgo(createdAt)}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ds-text)", marginBottom: body ? 4 : 0 }}>
          <strong style={{ fontWeight: 600, color: "var(--ds-heading)" }}>{actorName}</strong>{" "}
          <span style={{ color: "var(--ds-muted)" }}>{typeLabel}</span>
        </p>
        {body && (
          <p style={{
            fontSize: 12,
            color: "var(--ds-muted)",
            background: "var(--ds-bg)",
            border: "1px solid var(--ds-border)",
            borderRadius: 6,
            padding: "6px 10px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontStyle: "italic",
          }}>
            &ldquo;{body}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(notifs: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, any[]> = {};
  for (const n of notifs) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}
