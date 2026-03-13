"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isDisposableEmail } from "@/lib/disposable-email";
import { checkUsername } from "@/lib/username-filter";

async function setSettingsCookies(settings: {
  appearance_density?: string;
  appearance_font_size?: string;
  appearance_theme?: string;
  notify_email_mentions?: boolean;
  notify_email_dms?: boolean;
  notify_email_digest?: boolean;
}) {
  const cookieStore = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: "lax" as const };

  if (settings.appearance_density !== undefined) {
    cookieStore.set("cb_density", settings.appearance_density, opts);
  }
  if (settings.appearance_font_size !== undefined) {
    cookieStore.set("cb_font_size", settings.appearance_font_size, opts);
  }
  if (settings.appearance_theme !== undefined) {
    cookieStore.set("cb_theme", settings.appearance_theme, opts);
  }
  if (settings.notify_email_mentions !== undefined) {
    cookieStore.set("cb_notify_mentions", String(settings.notify_email_mentions), opts);
  }
  if (settings.notify_email_dms !== undefined) {
    cookieStore.set("cb_notify_dms", String(settings.notify_email_dms), opts);
  }
  if (settings.notify_email_digest !== undefined) {
    cookieStore.set("cb_notify_digest", String(settings.notify_email_digest), opts);
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const displayName = (formData.get("displayName") as string)?.trim();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const statusMessage = (formData.get("statusMessage") as string)?.trim() || null;
  const statusEmoji = (formData.get("statusEmoji") as string)?.trim() || null;

  // Validate username
  if (username) {
    if (username.length < 3) return { error: "Username must be at least 3 characters." };
    if (username.length > 20) return { error: "Username must be 20 characters or less." };
    if (!/^[a-z0-9_-]+$/.test(username)) return { error: "Only lowercase letters, numbers, hyphens, and underscores." };

    const filter = checkUsername(username);
    if (!filter.ok) return { error: filter.reason };

    // Check uniqueness (exclude self)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .single();

    if (existing) return { error: "This username is already taken." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || undefined,
      status_message: statusMessage,
      status_emoji: statusEmoji,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAvatarUrl(avatarUrl: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const newEmail = (formData.get("email") as string)?.trim();
  if (!newEmail) return { error: "Email is required." };

  if (isDisposableEmail(newEmail)) {
    return { error: "Please use a permanent email address. Disposable email services are not allowed." };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) return { error: error.message };

  return { success: true, message: "Check your new email for a confirmation link." };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const newPassword = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Delete profile (cascades to memberships via DB)
  await supabase.from("profiles").delete().eq("id", user.id);

  // Delete auth user
  await admin.auth.admin.deleteUser(user.id);

  // Sign out
  await supabase.auth.signOut();

  // Clear settings cookies
  const cookieStore = await cookies();
  cookieStore.delete("cb_density");
  cookieStore.delete("cb_font_size");
  cookieStore.delete("cb_theme");
  cookieStore.delete("cb_notify_mentions");
  cookieStore.delete("cb_notify_dms");
  cookieStore.delete("cb_notify_digest");

  redirect("/login");
}

export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const emailMentions = formData.get("emailMentions") === "on";
  const emailDms = formData.get("emailDms") === "on";
  const emailDigest = formData.get("emailDigest") === "on";
  const pushDms = formData.get("pushDms") === "on";
  const pushMentions = formData.get("pushMentions") === "on";
  const pushThreads = formData.get("pushThreads") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_email_mentions: emailMentions,
      notify_email_dms: emailDms,
      notify_email_digest: emailDigest,
      notify_push_dms: pushDms,
      notify_push_mentions: pushMentions,
      notify_push_threads: pushThreads,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await setSettingsCookies({
    notify_email_mentions: emailMentions,
    notify_email_dms: emailDms,
    notify_email_digest: emailDigest,
  });

  revalidatePath("/dashboard/settings/notifications");
  return { success: true };
}

export async function updateAppearanceSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const messageDensity = (formData.get("messageDensity") as string) || "comfortable";
  const fontSize = (formData.get("fontSize") as string) || "medium";

  const { error } = await supabase
    .from("profiles")
    .update({
      appearance_density: messageDensity,
      appearance_font_size: fontSize,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await setSettingsCookies({
    appearance_density: messageDensity,
    appearance_font_size: fontSize,
  });

  revalidatePath("/dashboard/settings/appearance");
  return { success: true };
}

