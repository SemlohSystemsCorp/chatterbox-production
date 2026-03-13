import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/billing";
import { ChannelChat } from "./channel-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelSlug: string }>;
}): Promise<Metadata> {
  const { channelSlug } = await params;
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("name")
    .eq("slug", channelSlug)
    .single();
  return { title: `#${channel?.name ?? channelSlug}` };
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: box } = await supabase
    .from("boxes")
    .select("id, org_id")
    .eq("slug", slug)
    .single();

  if (!box) {
    notFound();
  }

  // Get channel
  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, slug, description, topic, is_private, box_id")
    .eq("slug", channelSlug)
    .eq("box_id", box.id)
    .single();

  if (!channel) {
    notFound();
  }

  // Check plan for message history limits
  const admin = createAdminClient();
  const { data: boxPlan } = await admin
    .from("boxes")
    .select("plan")
    .eq("id", box.id)
    .single();

  const plan = boxPlan?.plan === "pro" ? "pro" : "free";
  const historyDays = PLAN_LIMITS[plan].historyDays;

  // Fetch recent messages with user profiles
  let messagesQuery = supabase
    .from("messages")
    .select("id, content, created_at, is_edited, user_id, thread_id")
    .eq("channel_id", channel.id)
    .eq("is_deleted", false)
    .is("thread_id", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (historyDays !== Infinity) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - historyDays);
    messagesQuery = messagesQuery.gte("created_at", cutoff.toISOString());
  }

  const { data: messages } = await messagesQuery;

  // Fetch profiles, reactions, attachments, and thread replies in parallel
  const userIds = [...new Set((messages || []).map((m) => m.user_id).filter(Boolean))] as string[];
  const messageIds = (messages || []).map((m) => m.id);

  const [{ data: profiles }, { data: reactions }, { data: attachments }, { data: threadReplies }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? supabase.from("reactions").select("id, message_id, user_id, emoji").in("message_id", messageIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? supabase.from("attachments").select("id, message_id, file_name, file_url, file_type, file_size").in("message_id", messageIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? supabase.from("messages").select("thread_id").in("thread_id", messageIds).eq("is_deleted", false)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
  (profiles || []).forEach((p: any) => {
    profileMap[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
  });

  const reactionsMap: Record<string, { id: string; user_id: string; emoji: string }[]> = {};
  (reactions || []).forEach((r: any) => {
    if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
    reactionsMap[r.message_id].push({ id: r.id, user_id: r.user_id, emoji: r.emoji });
  });

  const attachmentsMap: Record<string, { id: string; file_name: string; file_url: string; file_type: string | null; file_size: number | null }[]> = {};
  (attachments || []).forEach((a: any) => {
    if (!attachmentsMap[a.message_id]) attachmentsMap[a.message_id] = [];
    attachmentsMap[a.message_id].push({ id: a.id, file_name: a.file_name, file_url: a.file_url, file_type: a.file_type, file_size: a.file_size });
  });

  const replyCountMap: Record<string, number> = {};
  (threadReplies || []).forEach((r: any) => {
    if (r.thread_id) {
      replyCountMap[r.thread_id] = (replyCountMap[r.thread_id] || 0) + 1;
    }
  });

  // Auto-join channel if not a member (public channels only)
  const { data: existingMembership } = await supabase
    .from("channel_members")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("user_id", user.id)
    .single();

  if (!existingMembership && !channel.is_private) {
    await supabase.from("channel_members").insert({
      channel_id: channel.id,
      user_id: user.id,
    });
  }

  // If private and not a member, deny access
  if (channel.is_private && !existingMembership) {
    notFound();
  }

  // Mark channel as read
  await supabase
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channel.id)
    .eq("user_id", user.id);

  // Member count
  const { count: memberCount } = await supabase
    .from("channel_members")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", channel.id);

  return (
    <ChannelChat
      channel={{
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        topic: channel.topic,
        is_private: channel.is_private,
        memberCount: memberCount || 1,
      }}
      boxId={box.id}
      initialMessages={(messages || []).map((m) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        is_edited: m.is_edited,
        is_deleted: false,
        user_id: m.user_id,
        profile: m.user_id ? profileMap[m.user_id] || null : null,
        reactions: reactionsMap[m.id] || [],
        reply_count: replyCountMap[m.id] || 0,
        attachments: attachmentsMap[m.id] || [],
      }))}
      currentUserId={user.id}
    />
  );
}
