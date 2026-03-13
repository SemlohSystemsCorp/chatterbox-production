"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "dm" | "mention" | "thread_reply";
  message_id: string | null;
  actor_id: string | null;
  channel_id: string | null;
  conversation_id: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotificationBellProps {
  currentUserId: string;
  boxSlug: string;
}

export function NotificationBell({ currentUserId, boxSlug }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && window.Notification.permission === "default") {
      window.Notification.requestPermission();
    }
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    async function fetchUnreadCount() {
      const supabase = createClient();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    }
    fetchUnreadCount();
  }, [currentUserId]);

  // Realtime subscription for new notifications
  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const n = payload.new as any;
          let actor_profile = null;
          if (n.actor_id) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("id", n.actor_id)
              .single();
            actor_profile = data;
          }
          const newNotif: Notification = {
            id: n.id,
            type: n.type,
            message_id: n.message_id,
            actor_id: n.actor_id,
            channel_id: n.channel_id,
            conversation_id: n.conversation_id,
            body: n.body,
            is_read: n.is_read,
            created_at: n.created_at,
            actor_profile,
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 30));
          if (!n.is_read) {
            setUnreadCount((c) => c + 1);
          }

          // Dispatch push notification via server (fires push to user's other devices).
          // Uses the same tag so duplicates from the DB trigger are harmless.
          fetch("/api/notifications/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notification_id: n.id }),
          }).catch(() => {});

          // Show browser notification if tab is not focused
          if (
            !document.hasFocus() &&
            "Notification" in window &&
            window.Notification.permission === "granted"
          ) {
            const actorName = actor_profile?.display_name || actor_profile?.username || "Someone";
            let title: string;
            switch (n.type) {
              case "dm":
                title = `${actorName} sent you a message`;
                break;
              case "thread_reply":
                title = `${actorName} replied in a thread`;
                break;
              case "mention":
                title = `${actorName} mentioned you`;
                break;
              default:
                title = "New notification";
            }
            const browserNotif = new window.Notification(title, {
              body: n.body || undefined,
              icon: actor_profile?.avatar_url || "/favicon.ico",
              tag: n.id,
            });
            browserNotif.onclick = () => {
              window.focus();
              browserNotif.close();
            };
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log(`[Realtime] notifications:${currentUserId}:`, status, err ?? "");
      });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUserId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);

    const supabase = createClient();
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, type, message_id, actor_id, channel_id, conversation_id, body, is_read, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notifs) {
      // Fetch actor profiles
      const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter(Boolean))] as string[];
      const { data: profiles } = actorIds.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", actorIds)
        : { data: [] };

      const profileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
      });

      // Fetch channel slugs for channel notifications
      const channelIds = [...new Set(notifs.map((n) => n.channel_id).filter(Boolean))] as string[];
      const { data: channels } = channelIds.length
        ? await supabase
            .from("channels")
            .select("id, slug, name")
            .in("id", channelIds)
        : { data: [] };

      const channelMap: Record<string, { slug: string; name: string }> = {};
      (channels || []).forEach((c) => {
        channelMap[c.id] = { slug: c.slug, name: c.name };
      });

      // Fetch conversation slugs for DM notifications
      const convIds = [...new Set(notifs.map((n) => n.conversation_id).filter(Boolean))] as string[];
      const { data: convs } = convIds.length
        ? await supabase
            .from("conversations")
            .select("id, slug")
            .in("id", convIds)
        : { data: [] };

      const convMap: Record<string, string> = {};
      (convs || []).forEach((c) => {
        convMap[c.id] = c.slug;
      });

      setNotifications(
        notifs.map((n) => ({
          ...n,
          actor_profile: n.actor_id ? profileMap[n.actor_id] || null : null,
          _channelSlug: n.channel_id ? channelMap[n.channel_id]?.slug : undefined,
          _channelName: n.channel_id ? channelMap[n.channel_id]?.name : undefined,
          _convSlug: n.conversation_id ? convMap[n.conversation_id] : undefined,
        })) as any
      );
    }

    setLoading(false);
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleNotifClick(n: any) {
    // Mark this notification as read
    if (!n.is_read) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === n.id ? { ...notif, is_read: true } : notif))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setOpen(false);

    // Navigate to the relevant location
    if (n._channelSlug) {
      router.push(`/box/${boxSlug}/c/${n._channelSlug}`);
    } else if (n._convSlug) {
      router.push(`/box/${boxSlug}/dm/${n._convSlug}`);
    }
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  function notifLabel(n: any): string {
    const name = n.actor_profile?.display_name || n.actor_profile?.username || "Someone";
    switch (n.type) {
      case "dm":
        return `${name} sent you a message`;
      case "thread_reply":
        return `${name} replied in a thread`;
      case "mention":
        return `${name} mentioned you`;
      default:
        return `${name} sent a notification`;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-lg border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Loading...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No notifications yet
              </div>
            )}
            {!loading &&
              notifications.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
                    !n.is_read && "bg-primary/[0.03]"
                  )}
                >
                  {/* Avatar */}
                  <div className="shrink-0 pt-0.5">
                    {n.actor_profile?.avatar_url ? (
                      <img
                        src={n.actor_profile.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {(n.actor_profile?.display_name || n.actor_profile?.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-foreground">
                      <span className="font-medium">{notifLabel(n)}</span>
                      {n._channelName && (
                        <span className="text-muted-foreground"> in #{n._channelName}</span>
                      )}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
