import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage how you appear to others on Chatterbox.
        </p>
      </div>

      <ProfileForm
        profile={{
          displayName: profile.display_name || "",
          username: profile.username || "",
          avatarUrl: profile.avatar_url,
          email: profile.email,
          statusMessage: profile.status_message || "",
          statusEmoji: profile.status_emoji || "",
        }}
      />
    </div>
  );
}
