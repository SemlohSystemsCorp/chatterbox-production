"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { resend } from "@/lib/resend";
import { nanoid } from "nanoid";
import { verifyTurnstile } from "@/lib/turnstile";
import { isDisposableEmail } from "@/lib/disposable-email";
import { assertSeatAvailable, syncStripeSeats, QuotaError } from "@/lib/billing";

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const captcha = await verifyTurnstile(turnstileToken);
  if (!captcha.success) return { error: captcha.error };

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string || "").trim();
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  if (isDisposableEmail(email)) {
    return { error: "Please use a permanent email address. Disposable email services are not allowed." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin.from("verification_codes").insert({
    id: nanoid(),
    email,
    code,
    type: "signup",
    expires_at: expiresAt,
  });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Chatterbox <noreply@chatterbox.app>",
      to: email,
      subject: "Verify your Chatterbox account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0f0f0f; font-size: 24px; font-weight: 600; margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #737373; font-size: 16px; margin-bottom: 32px;">
            Enter this code to finish creating your Chatterbox account.
          </p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f0f0f;">${code}</span>
          </div>
          <p style="color: #a1a1aa; font-size: 14px;">
            This code expires in 10 minutes. If you didn't create an account, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch {
    return { error: "Failed to send verification email. Please try again." };
  }

  return { success: true, email };
}

export async function verifyCode(formData: FormData) {
  const admin = createAdminClient();

  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  const { data: record } = await admin
    .from("verification_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("type", "signup")
    .eq("used", false)
    .single();

  if (!record) {
    return { error: "Invalid verification code." };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { error: "Verification code has expired. Please sign up again." };
  }

  await admin.from("verification_codes").delete().eq("id", record.id);

  const { data: users } = await admin.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email === email);

  if (user) {
    await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
  }

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  return {
    success: true,
    tokenHash: linkData?.properties?.hashed_token,
  };
}

export async function resendVerificationCode(email: string) {
  const admin = createAdminClient();

  await admin
    .from("verification_codes")
    .delete()
    .eq("email", email)
    .eq("type", "signup")
    .eq("used", false);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin.from("verification_codes").insert({
    id: nanoid(),
    email,
    code,
    type: "signup",
    expires_at: expiresAt,
  });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Chatterbox <noreply@chatterbox.app>",
      to: email,
      subject: "Your new Chatterbox verification code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0f0f0f; font-size: 24px; font-weight: 600; margin-bottom: 8px;">New verification code</h2>
          <p style="color: #737373; font-size: 16px; margin-bottom: 32px;">
            Here's your new code to verify your Chatterbox account.
          </p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f0f0f;">${code}</span>
          </div>
          <p style="color: #a1a1aa; font-size: 14px;">
            This code expires in 10 minutes.
          </p>
        </div>
      `,
    });
  } catch {
    return { error: "Failed to send verification email." };
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const captcha = await verifyTurnstile(turnstileToken);
  if (!captcha.success) return { error: captcha.error };

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .single();

    if (!profile?.username) {
      redirect("/onboarding");
    }

    if (next && next.startsWith("/")) {
      redirect(next);
    }

    const { data: boxMembership } = await supabase
      .from("box_members")
      .select("box_id, boxes(slug)")
      .eq("user_id", data.user.id)
      .limit(1)
      .single();

    const boxSlug = (boxMembership as any)?.boxes?.slug;
    if (boxSlug) {
      redirect(`/box/${boxSlug}`);
    }

    redirect("/onboarding");
  }

  redirect("/");
}

export async function joinBoxByCode(code: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const trimmed = code.trim();
  if (!trimmed) return { error: "Please enter an invite code." };

  const { data: box } = await admin
    .from("boxes")
    .select("id, name, slug")
    .eq("slug", trimmed)
    .single();

  if (!box) return { error: "Invalid invite code. Please check and try again." };

  const { data: existing } = await admin
    .from("box_members")
    .select("id")
    .eq("box_id", box.id)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "You're already a member of this workspace." };

  // Enforce seat limit
  try {
    await assertSeatAvailable(box.id);
  } catch (e) {
    if (e instanceof QuotaError) {
      return { error: "This workspace has reached its member limit. Ask the owner to upgrade." };
    }
    throw e;
  }

  const { error: joinError } = await admin.from("box_members").insert({
    box_id: box.id,
    user_id: user.id,
  });

  if (joinError) return { error: joinError.message };

  const { data: publicChannels } = await admin
    .from("channels")
    .select("id")
    .eq("box_id", box.id)
    .eq("is_private", false)
    .eq("is_archived", false);

  if (publicChannels && publicChannels.length > 0) {
    await admin.from("channel_members").insert(
      publicChannels.map((c) => ({ channel_id: c.id, user_id: user.id }))
    );
  }

  // Update Stripe subscription quantity (no-ops on free plan)
  syncStripeSeats(box.id).catch(() => {});

  return { success: true, boxSlug: box.slug };
}

export async function setUsernameOnboarding(username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const cleaned = username.trim().toLowerCase();
  if (cleaned.length < 3) return { error: "Must be at least 3 characters." };
  if (cleaned.length > 20) return { error: "Must be 20 characters or less." };
  if (!/^[a-z0-9_-]+$/.test(cleaned)) return { error: "Letters, numbers, hyphens, and underscores only." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleaned)
    .single();

  if (existing) return { error: "That username is taken." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: cleaned })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function signInWithOAuth(provider: "google") {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for the password reset link." };
}
