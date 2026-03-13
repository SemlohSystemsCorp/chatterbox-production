"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardHeaderProps {
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string;
  };
  unreadCount: number;
}

export function DashboardHeader({ profile, unreadCount }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initial = (profile.display_name || profile.email)[0].toUpperCase();
  const firstName = profile.display_name?.split(" ")[0] || profile.username || "";

  return (
    <header style={{ borderBottom: "1px solid var(--ds-border)", background: "var(--ds-surface)", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>

        {/* Left: logo */}
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ds-heading)", letterSpacing: "-0.01em" }}>
            Chatterbox
          </span>
        </Link>

        {/* Right: actions + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

          {/* Notifications bell */}
          <Link
            href="/dashboard/notifications"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              color: "var(--ds-muted)",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            className="header-icon-btn"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--ds-primary)",
                border: "1.5px solid var(--ds-surface)",
              }} />
            )}
          </Link>

          {/* Settings */}
          <Link
            href="/dashboard/settings/profile"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              color: "var(--ds-muted)",
              textDecoration: "none",
            }}
            className="header-icon-btn"
          >
            <Settings size={17} />
          </Link>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "var(--ds-border)", margin: "0 6px" }} />

          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--ds-primary) 14%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ds-primary)",
                flexShrink: 0,
              }}>
                {initial}
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>
              {firstName}
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ds-muted)",
              marginLeft: 2,
            }}
            className="header-icon-btn"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
