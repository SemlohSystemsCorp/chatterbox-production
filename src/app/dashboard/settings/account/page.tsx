import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "./account-form";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasPassword = user.app_metadata?.provider === "email";
  const connectedProviders = user.app_metadata?.providers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Account</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your email, password, and account security.
        </p>
      </div>

      <AccountForm
        email={user.email || ""}
        hasPassword={hasPassword}
        connectedProviders={connectedProviders as string[]}
        createdAt={user.created_at}
      />
    </div>
  );
}
