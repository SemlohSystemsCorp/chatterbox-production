import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "../dashboard-nav";

export default async function SettingsLayout({
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

  if (!profile) redirect("/login");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 40 }}>
      <DashboardNav
        profile={{
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          email: profile.email,
        }}
      />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
