import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export const runtime = "edge";

// POST /api/notifications/push/send
// Called by Supabase webhook on notification INSERT.
// Body: { notification_id: string } or Supabase webhook payload with { record: { id, ... } }
export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Check user push preferences
  const { data: profile } = await admin
    .from("profiles")
    .select("notify_push_dms, notify_push_mentions, notify_push_threads")
    .eq("id", notif.user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user wants push for this notification type
  if (notif.type === "dm" && !profile.notify_push_dms) {
    return NextResponse.json({ skipped: true, reason: "push_dms_disabled" });
  }
  if (notif.type === "mention" && !profile.notify_push_mentions) {
    return NextResponse.json({ skipped: true, reason: "push_mentions_disabled" });
  }
  if (notif.type === "thread_reply" && !profile.notify_push_threads) {
    return NextResponse.json({ skipped: true, reason: "push_threads_disabled" });
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

  // Build push payload
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

  // Build URL for click-through
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
      if (box) {
        url = `/box/${box.slug}/c/${channel.slug}`;
      }
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
      if (box) {
        url = `/box/${box.slug}/dm/${conv.slug}`;
      }
    }
  }

  // Fetch all push subscriptions for this user
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notif.user_id);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no_subscriptions" });
  }

  const payload = {
    title,
    body: notif.body || "",
    tag: notif.id,
    url,
  };

  // Send to all subscriptions, clean up expired ones
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  const expiredIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const statusCode = result.reason?.statusCode;
      // 404 or 410 means subscription is no longer valid
      if (statusCode === 404 || statusCode === 410) {
        expiredIds.push(subscriptions[i].id);
      } else {
        console.error("Push send failed:", result.reason);
      }
    }
  });

  // Remove expired subscriptions
  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, expired: expiredIds.length });
}
