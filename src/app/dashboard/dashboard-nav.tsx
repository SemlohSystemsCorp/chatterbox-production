"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Bell, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string;
  };
}

const navItems = [
  { href: "/dashboard/settings/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings/account", label: "Account", icon: Shield },
  { href: "/dashboard/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings/appearance", label: "Appearance", icon: Palette },
];

export function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <aside style={{ width: 180, flexShrink: 0 }}>
      {/* User info */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--ds-primary) 12%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ds-primary)",
              flexShrink: 0,
            }}>
              {(profile.display_name || profile.email)[0].toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.display_name || profile.username}
            </p>
            <p style={{ fontSize: 12, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              @{profile.username}
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ds-muted)", textTransform: "uppercase", marginBottom: 6, paddingLeft: 10 }}>
        Settings
      </p>

      {/* Nav links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-white font-medium text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
