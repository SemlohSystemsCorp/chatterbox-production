"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  MessageSquare,
  Search,
  Circle,
  LayoutDashboard,
  User,
  Settings,
  UserPlus,
  Users,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "../../(auth)/actions";
import { CreateChannelModal } from "./create-channel-modal";
import { InviteChannelModal } from "./invite-channel-modal";
import { CreateGroupDmModal } from "./create-group-dm-modal";
import { InviteBoxModal } from "./invite-box-modal";
import { NotificationBell } from "./notification-bell";

interface DirectMessage {
  conversationId: string;
  slug: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  status: string;
}

interface GroupDm {
  conversationId: string;
  slug: string;
  name: string | null;
  members: {
    userId: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  }[];
}

interface BoxMember {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface BoxSidebarProps {
  box: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  channels: {
    id: string;
    name: string;
    slug: string;
    is_private: boolean;
  }[];
  directMessages: DirectMessage[];
  groupDms: GroupDm[];
  boxMembers: BoxMember[];
  currentUserId: string;
  channelUnreads: Record<string, number>;
  dmUnreads: Record<string, number>;
  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string;
    status: string;
  } | null;
}

export function BoxSidebar({
  box,
  channels: initialChannels,
  directMessages: initialDms,
  groupDms: initialGroupDms,
  boxMembers,
  currentUserId,
  channelUnreads: initialChannelUnreads,
  dmUnreads: initialDmUnreads,
  profile,
}: BoxSidebarProps) {
  const pathname = usePathname();
  const [channels, setChannels] = useState(initialChannels);
  const [directMessages, setDirectMessages] = useState(initialDms);
  const [groupDms, setGroupDms] = useState(initialGroupDms);
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>(initialChannelUnreads);
  const [dmUnreads, setDmUnreads] = useState<Record<string, number>>(initialDmUnreads);
  const [showChannels, setShowChannels] = useState(true);
  const [showDms, setShowDms] = useState(true);
  const [showGroupDms, setShowGroupDms] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateGroupDm, setShowCreateGroupDm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("cb_theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("cb_theme", "light");
    }
  }
  const [inviteChannelId, setInviteChannelId] = useState<string | null>(null);
  const [showInviteBox, setShowInviteBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const activeChannelIdRef = useRef<string | null>(null);
  const activeDmIdRef = useRef<string | null>(null);

  // Keep state in sync when props change (e.g. navigation)
  useEffect(() => { setChannels(initialChannels); }, [initialChannels]);
  useEffect(() => { setDirectMessages(initialDms); }, [initialDms]);
  useEffect(() => { setGroupDms(initialGroupDms); }, [initialGroupDms]);

  // Clear unread count when user navigates into a channel or DM
  useEffect(() => {
    const chSlug = pathname.match(/\/c\/([^/]+)/)?.[1];
    const dmSlug = pathname.match(/\/dm\/([^/]+)/)?.[1];
    if (chSlug) {
      const ch = channels.find((c) => c.slug === chSlug);
      if (ch) {
        activeChannelIdRef.current = ch.id;
        activeDmIdRef.current = null;
        setChannelUnreads((prev) => {
          if (!prev[ch.id]) return prev;
          const next = { ...prev };
          delete next[ch.id];
          return next;
        });
      }
    } else if (dmSlug) {
      const conv =
        [...directMessages, ...groupDms].find((d) => d.slug === dmSlug);
      if (conv) {
        const convId = conv.conversationId;
        activeDmIdRef.current = convId;
        activeChannelIdRef.current = null;
        setDmUnreads((prev) => {
          if (!prev[convId]) return prev;
          const next = { ...prev };
          delete next[convId];
          return next;
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to channel changes for this box
    const channelSub = supabase
      .channel(`box-${box.id}-channels`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channels",
          filter: `box_id=eq.${box.id}`,
        },
        (payload) => {
          const ch = payload.new as { id: string; name: string; slug: string; is_private: boolean; is_archived: boolean };
          if (!ch.is_archived) {
            setChannels((prev) => {
              if (prev.some((c) => c.id === ch.id)) return prev;
              return [...prev, { id: ch.id, name: ch.name, slug: ch.slug, is_private: ch.is_private }].sort((a, b) =>
                a.name.localeCompare(b.name)
              );
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channels",
          filter: `box_id=eq.${box.id}`,
        },
        (payload) => {
          const ch = payload.new as { id: string; name: string; slug: string; is_private: boolean; is_archived: boolean };
          if (ch.is_archived) {
            setChannels((prev) => prev.filter((c) => c.id !== ch.id));
          } else {
            setChannels((prev) =>
              prev
                .map((c) => (c.id === ch.id ? { id: ch.id, name: ch.name, slug: ch.slug, is_private: ch.is_private } : c))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "channels",
          filter: `box_id=eq.${box.id}`,
        },
        (payload) => {
          const ch = payload.old as { id: string };
          setChannels((prev) => prev.filter((c) => c.id !== ch.id));
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log(`[Realtime] box-${box.id}-channels:`, status, err ?? "");
      });

    // Subscribe to profile changes for DM partner statuses
    const dmUserIds = initialDms.map((dm) => dm.userId);
    let profileSub: ReturnType<typeof supabase.channel> | null = null;

    if (dmUserIds.length > 0) {
      profileSub = supabase
        .channel(`box-${box.id}-profiles`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
          },
          (payload) => {
            const p = payload.new as { id: string; display_name: string | null; username: string | null; avatar_url: string | null; status: string };
            setDirectMessages((prev) =>
              prev.map((dm) =>
                dm.userId === p.id
                  ? { ...dm, displayName: p.display_name, username: p.username, avatarUrl: p.avatar_url, status: p.status }
                  : dm
              )
            );
          }
        )
        .subscribe((status: string, err?: Error) => {
          console.log(`[Realtime] box-${box.id}-profiles:`, status, err ?? "");
        });
    }

    // Subscribe to new messages for unread badge tracking
    const msgSub = supabase
      .channel(`box-${box.id}-unreads`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as {
            user_id: string | null;
            channel_id: string | null;
            conversation_id: string | null;
            thread_id: string | null;
          };
          if (msg.user_id === currentUserId) return;
          if (msg.thread_id) return;
          if (msg.channel_id && msg.channel_id !== activeChannelIdRef.current) {
            setChannelUnreads((prev) => ({
              ...prev,
              [msg.channel_id!]: (prev[msg.channel_id!] || 0) + 1,
            }));
          }
          if (msg.conversation_id && msg.conversation_id !== activeDmIdRef.current) {
            setDmUnreads((prev) => ({
              ...prev,
              [msg.conversation_id!]: (prev[msg.conversation_id!] || 0) + 1,
            }));
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log(`[Realtime] box-${box.id}-unreads:`, status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channelSub);
      supabase.removeChannel(msgSub);
      if (profileSub) supabase.removeChannel(profileSub);
    };
  }, [box.id, currentUserId, initialDms]);

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDms = directMessages.filter((dm) =>
    (dm.displayName || dm.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGroupDms = groupDms.filter((g) => {
    const label = g.name || g.members.map((m) => m.displayName || m.username).join(", ");
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <aside className="flex h-full w-[260px] flex-col border-r border-border bg-white">
        {/* Box header */}
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {box.name}
              </p>
              {box.description && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {box.description}
                </p>
              )}
            </div>
            <NotificationBell currentUserId={currentUserId} boxSlug={box.slug} />
            <Link
              href={`/box/${box.slug}/search`}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Search messages"
            >
              <Search className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => setShowInviteBox(true)}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Invite people"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
            <Link
              href={`/box/${box.slug}/settings`}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Workspace settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-accent/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* Channels section */}
          <div className="mb-1">
            <div className="flex items-center justify-between pr-1">
              <button
                onClick={() => setShowChannels(!showChannels)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                {showChannels ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Channels
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {channels.length}
                </span>
              </button>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Create channel"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showChannels && (
              <div className="mt-0.5 space-y-px">
                {filteredChannels.map((channel) => {
                  const href = `/box/${box.slug}/c/${channel.slug}`;
                  const active = pathname === href;
                  const unread = channelUnreads[channel.id] || 0;
                  return (
                    <div key={channel.id} className="group/ch flex items-center">
                      <Link
                        href={href}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : unread > 0
                            ? "font-semibold text-foreground hover:bg-accent"
                            : "text-foreground/80 hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {channel.is_private ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Hash className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="truncate">{channel.name}</span>
                        {unread > 0 && !active && (
                          <span className="ml-auto shrink-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </Link>
                      {channel.is_private && (
                        <button
                          onClick={() => setInviteChannelId(channel.id)}
                          className="mr-1 hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground group-hover/ch:block"
                          title="Invite members"
                        >
                          <UserPlus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredChannels.length === 0 && channels.length > 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No matching channels
                  </p>
                )}
                {channels.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No channels yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Direct Messages section */}
          <div className="mt-2">
            <div className="flex items-center justify-between pr-1">
              <button
                onClick={() => setShowDms(!showDms)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                {showDms ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Messages
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {directMessages.length}
                </span>
              </button>
            </div>

            {showDms && (
              <div className="mt-0.5 space-y-px">
                {filteredDms.map((dm) => {
                  const href = `/box/${box.slug}/dm/${dm.slug}`;
                  const active = pathname === href;
                  const unread = dmUnreads[dm.conversationId] || 0;
                  return (
                    <Link
                      key={dm.conversationId}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : unread > 0
                          ? "font-semibold text-foreground hover:bg-accent"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        {dm.avatarUrl ? (
                          <img
                            src={dm.avatarUrl}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                            {(dm.displayName || dm.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <Circle
                          className={cn(
                            "absolute -bottom-px -right-px h-2 w-2 fill-current",
                            dm.status === "online"
                              ? "text-success"
                              : "text-muted-foreground/30"
                          )}
                          strokeWidth={3}
                          stroke="white"
                        />
                      </div>
                      <span className="truncate">
                        {dm.displayName || dm.username || "Unknown"}
                      </span>
                      {unread > 0 && !active && (
                        <span className="ml-auto shrink-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {filteredDms.length === 0 && directMessages.length > 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No matching people
                  </p>
                )}
                {directMessages.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No conversations yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Group Messages section */}
          <div className="mt-2">
            <div className="flex items-center justify-between pr-1">
              <button
                onClick={() => setShowGroupDms(!showGroupDms)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                {showGroupDms ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Group Messages
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {groupDms.length}
                </span>
              </button>
              <button
                onClick={() => setShowCreateGroupDm(true)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="New group message"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showGroupDms && (
              <div className="mt-0.5 space-y-px">
                {filteredGroupDms.map((g) => {
                  const href = `/box/${box.slug}/dm/${g.slug}`;
                  const active = pathname === href;
                  const unread = dmUnreads[g.conversationId] || 0;
                  const label =
                    g.name ||
                    g.members
                      .map((m) => m.displayName || m.username || "Unknown")
                      .join(", ");
                  return (
                    <Link
                      key={g.conversationId}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : unread > 0
                          ? "font-semibold text-foreground hover:bg-accent"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-3 w-3" />
                      </div>
                      <span className="truncate">{label}</span>
                      {unread > 0 && !active ? (
                        <span className="ml-auto shrink-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                          {g.members.length + 1}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {filteredGroupDms.length === 0 && groupDms.length > 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No matching groups
                  </p>
                )}
                {groupDms.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No group conversations yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User footer */}
        {profile && (
          <div className="relative border-t border-border px-3 py-2.5">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-accent"
            >
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {(profile.display_name || profile.email)[0].toUpperCase()}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                    profile.status === "online"
                      ? "bg-success"
                      : "bg-muted-foreground/40"
                  )}
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile.display_name || profile.username}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  @{profile.username}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute bottom-full left-3 right-3 z-50 mb-1 rounded-lg border border-border bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{profile.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/settings/account"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={toggleTheme}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                    >
                      {isDark ? <Sun className="h-3.5 w-3.5 text-muted-foreground" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
                      {isDark ? "Light mode" : "Dark mode"}
                    </button>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/5"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {showCreateChannel && (
        <CreateChannelModal
          boxId={box.id}
          boxSlug={box.slug}
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {inviteChannelId && (
        <InviteChannelModal
          channelId={inviteChannelId}
          channelName={channels.find((c) => c.id === inviteChannelId)?.name || "channel"}
          boxId={box.id}
          onClose={() => setInviteChannelId(null)}
        />
      )}

      {showCreateGroupDm && (
        <CreateGroupDmModal
          boxId={box.id}
          boxSlug={box.slug}
          currentUserId={currentUserId}
          members={boxMembers}
          onClose={() => setShowCreateGroupDm(false)}
        />
      )}

      {showInviteBox && (
        <InviteBoxModal
          boxId={box.id}
          boxName={box.name}
          boxSlug={box.slug}
          channels={channels}
          onClose={() => setShowInviteBox(false)}
        />
      )}
    </>
  );
}
