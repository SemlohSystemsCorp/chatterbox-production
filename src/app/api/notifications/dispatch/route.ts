import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotification } from "@/lib/push";
import { resend } from "@/lib/resend";

export const runtime = "edge";

// POST /api/notifications/dispatch
// Single entry point for all notification delivery (email + push).
// Called by:
//   1. Supabase database webhook (pg_net) on notification INSERT (production)
//   2. Notification bell via fetch (local dev fallback, authenticated via session)
// Body: Supabase webhook payload { record: { id, ... } } or { notification_id: string }
export async function POST(req: NextRequest) {
  // Allow access via webhook secret OR authenticated user session
  const secret = req.headers.get("x-webhook-secret");
  const hasWebhookAuth = process.env.WEBHOOK_SECRET && secret === process.env.WEBHOOK_SECRET;

  if (!hasWebhookAuth) {
    // Fall back to session auth (for client-side calls)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
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

  // Fetch user profile with all preferences
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "email, display_name, notify_email_dms, notify_email_mentions, notify_push_dms, notify_push_mentions, notify_push_threads"
    )
    .eq("id", notif.user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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

  // Build title
  let title: string;
  switch (notif.type) {
    case "dm":
      title = `${actorName} sent you a message`;
      break;
    case "thread_reply":
      title = `${actorName} replied in a thread`;
      break;
    case "mention":
      title = `${actorName} mentioned you`;
      break;
    default:
      title = "New notification";
  }

  const results: { email?: string; push?: string } = {};

  // ── EMAIL ──
  const wantsEmail =
    (notif.type === "dm" && profile.notify_email_dms) ||
    (notif.type === "mention" && profile.notify_email_mentions) ||
    (notif.type === "thread_reply" && profile.notify_email_mentions);

  if (wantsEmail) {
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "Chatterbox <notifications@chatterbox.app>";
    try {
      await resend.emails.send({
        from: fromAddress,
        to: profile.email,
        subject: title,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px;">
              <h2 style="margin: 0; font-size: 16px; color: #111827;">${title}</h2>
            </div>
            ${notif.body ? `<p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.5; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #6366f1;">${notif.body}</p>` : ""}
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Open Chatterbox to reply.</p>
          </div>
        `,
      });
      results.email = "sent";
    } catch (err) {
      console.error("Failed to send notification email:", err);
      results.email = "failed";
    }
  } else {
    results.email = "skipped";
  }

  // ── PUSH ──
  const wantsPush =
    (notif.type === "dm" && profile.notify_push_dms) ||
    (notif.type === "mention" && profile.notify_push_mentions) ||
    (notif.type === "thread_reply" && profile.notify_push_threads);

  if (wantsPush) {
    // Build click-through URL
    let url = "/";
    if (notif.channel_id) {
      const { data: channel } = await admin
        .from("channels")
        .select("slug, box_id")
        .eq("id", notif.channel_id)
        .single();
      if (channel) {
        const { data: box } = await admin
          .from("boxes")
          .select("slug")
          .eq("id", channel.box_id)
          .single();
        if (box) url = `/box/${box.slug}/c/${channel.slug}`;
      }
    } else if (notif.conversation_id) {
      const { data: conv } = await admin
        .from("conversations")
        .select("slug, box_id")
        .eq("id", notif.conversation_id)
        .single();
      if (conv) {
        const { data: box } = await admin
          .from("boxes")
          .select("slug")
          .eq("id", conv.box_id)
          .single();
        if (box) url = `/box/${box.slug}/dm/${conv.slug}`;
      }
    }

    // Fetch all push subscriptions for this user
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notif.user_id);

    if (!subscriptions || subscriptions.length === 0) {
      results.push = "no_subscriptions";
    } else {
      const payload = { title, body: notif.body || "", tag: notif.id, url };
      const pushResults = await Promise.allSettled(
        subscriptions.map((sub) => sendPushNotification(sub, payload))
      );

      // Clean up expired subscriptions
      const expiredIds: string[] = [];
      pushResults.forEach((r, i) => {
        if (r.status === "rejected") {
          const code = r.reason?.statusCode;
          if (code === 404 || code === 410) {
            expiredIds.push(subscriptions[i].id);
          } else {
            console.error("Push send failed:", r.reason);
          }
        }
      });
      if (expiredIds.length > 0) {
        await admin.from("push_subscriptions").delete().in("id", expiredIds);
      }

      const sent = pushResults.filter((r) => r.status === "fulfilled").length;
      results.push = `sent:${sent},expired:${expiredIds.length}`;
    }
  } else {
    results.push = "skipped";
  }

  return NextResponse.json(results);
}
