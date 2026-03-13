import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppearanceForm } from "./appearance-form";

export default async function AppearanceSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("appearance_density, appearance_font_size, appearance_theme")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Appearance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize how Chatterbox looks and feels.
        </p>
      </div>

      <AppearanceForm
        defaults={{
          messageDensity: profile?.appearance_density || "comfortable",
          fontSize: profile?.appearance_font_size || "medium",
        }}
      />
    </div>
  );
}
