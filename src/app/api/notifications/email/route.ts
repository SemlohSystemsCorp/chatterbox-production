import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";

export const runtime = "edge";

// POST /api/notifications/email
// Called by Supabase webhook on notification INSERT, or manually.
// Body: { notification_id: string } or Supabase webhook payload with { record: { id, ... } }
export async function POST(req: NextRequest) {
  // Verify webhook secret if configured
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Support both direct call and Supabase webhook format
  const notificationId = body.notification_id || body.record?.id;
  if (!notificationId) {
    return NextResponse.json({ error: "Missing notification_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the notification
  const { data: notif } = await admin
    .from("notifications")
    .select("id, user_id, type, actor_id, body, channel_id, conversation_id")
    .eq("id", notificationId)
    .single();

  if (!notif) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  // Fetch user profile + email preferences
  const { data: user } = await admin
    .from("profiles")
    .select("email, display_name, notify_email_dms, notify_email_mentions")
    .eq("id", notif.user_id)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user wants email for this notification type
  if (notif.type === "dm" && !user.notify_email_dms) {
    return NextResponse.json({ skipped: true, reason: "email_dms_disabled" });
  }
  if (notif.type === "mention" && !user.notify_email_mentions) {
    return NextResponse.json({ skipped: true, reason: "email_mentions_disabled" });
  }
  if (notif.type === "thread_reply" && !user.notify_email_mentions) {
    // Thread replies use the mentions preference
    return NextResponse.json({ skipped: true, reason: "email_mentions_disabled" });
  }

  // Fetch actor name
  let actorName = "Someone";
  if (notif.actor_id) {
    const { data: actor } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", notif.actor_id)
      .single();
    if (actor) {
      actorName = actor.display_name || actor.username || "Someone";
    }
  }

  // Build email subject and body
  let subject: string;
  let preview = notif.body || "";

  switch (notif.type) {
    case "dm":
      subject = `New message from ${actorName}`;
      break;
    case "thread_reply":
      subject = `${actorName} replied in a thread`;
      break;
    case "mention":
      subject = `${actorName} mentioned you`;
      break;
    default:
      subject = `New notification from Chatterbox`;
  }

  // Send via Resend
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Chatterbox <notifications@chatterbox.app>";

  try {
    await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 16px; color: #111827;">${subject}</h2>
          </div>
          ${preview ? `<p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.5; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #6366f1;">${preview}</p>` : ""}
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            Open Chatterbox to reply.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send notification email:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }
}
