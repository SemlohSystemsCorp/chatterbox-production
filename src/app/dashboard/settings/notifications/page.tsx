import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsForm } from "./notifications-form";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_email_mentions, notify_email_dms, notify_email_digest, notify_push_dms, notify_push_mentions, notify_push_threads")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Choose what notifications you receive and how they&apos;re delivered.
        </p>
      </div>

      <NotificationsForm
        defaults={{
          emailMentions: profile?.notify_email_mentions ?? true,
          emailDms: profile?.notify_email_dms ?? true,
          emailDigest: profile?.notify_email_digest ?? false,
          pushDms: profile?.notify_push_dms ?? true,
          pushMentions: profile?.notify_push_mentions ?? true,
          pushThreads: profile?.notify_push_threads ?? true,
        }}
      />
    </div>
  );
}
