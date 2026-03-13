import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "./dashboard-header";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s — Chatterbox",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, email")
    .eq("id", user.id)
    .single();

  if (!profile?.username) redirect("/onboarding");

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-bg)" }}>
      <DashboardHeader
        profile={{
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          email: profile.email,
        }}
        unreadCount={unreadCount || 0}
      />
      {children}
    </div>
  );
}
