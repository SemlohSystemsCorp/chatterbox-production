import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/billing";
import { DmChat } from "./dm-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ dmSlug: string }>;
}): Promise<Metadata> {
  const { dmSlug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: conv } = await admin
    .from("conversations")
    .select("is_group, name, conversation_members(user_id)")
    .eq("slug", dmSlug)
    .single();

  if (!conv) return { title: "Direct message" };

  if (conv.is_group) {
    return { title: conv.name ?? "Group message" };
  }

  const partnerId = (conv.conversation_members as { user_id: string }[])
    .find((m) => m.user_id !== user?.id)?.user_id;

  if (!partnerId) return { title: "Direct message" };

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, username")
    .eq("id", partnerId)
    .single();

  return { title: profile?.display_name ?? profile?.username ?? "Direct message" };
}

export default async function DmPage({
  params,
}: {
  params: Promise<{ slug: string; dmSlug: string }>;
}) {
  const { slug, dmSlug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Look up conversation by slug (admin bypasses RLS)
  const { data: conversation } = await admin
    .from("conversations")
    .select("id, box_id, is_group, name")
    .eq("slug", dmSlug)
    .single();

  if (!conversation) {
    notFound();
  }

  // Verify user is a member
  const { data: myMembership } = await admin
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id)
    .single();

  if (!myMembership) {
    notFound();
  }

  // Mark conversation as read
  await admin
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id);

  // Get all members
  const { data: members } = await admin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversation.id);

  const otherMemberIds = (members || [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => id !== user.id) as string[];

  // Fetch all other member profiles
  const { data: memberProfiles } = otherMemberIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, username, avatar_url, status")
        .in("id", otherMemberIds)
    : { data: [] };

  const participants = (memberProfiles || []).map((p: { id: string; display_name: string | null; username: string | null; avatar_url: string | null; status: string }) => ({
    id: p.id,
    displayName: p.display_name,
    username: p.username,
    avatarUrl: p.avatar_url,
    status: p.status,
  }));

  // Check plan for message history limits
  const { data: boxPlan } = await admin
    .from("boxes")
    .select("plan")
    .eq("id", conversation.box_id)
    .single();

  const plan = boxPlan?.plan === "pro" ? "pro" : "free";
  const historyDays = PLAN_LIMITS[plan].historyDays;

  // Fetch recent DM messages
  let dmQuery = admin
    .from("messages")
    .select("id, content, created_at, is_edited, user_id")
    .eq("conversation_id", conversation.id)
    .eq("is_deleted", false)
    .is("thread_id", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (historyDays !== Infinity) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - historyDays);
    dmQuery = dmQuery.gte("created_at", cutoff.toISOString());
  }

  const { data: messages } = await dmQuery;

  // Fetch profiles, reactions, attachments, and thread replies in parallel
  const userIds = [...new Set((messages || []).map((m: { user_id: string | null }) => m.user_id).filter(Boolean))] as string[];
  const messageIds = (messages || []).map((m: { id: string }) => m.id);

  const [{ data: profiles }, { data: reactions }, { data: attachments }, { data: threadReplies }] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? admin.from("reactions").select("id, message_id, user_id, emoji").in("message_id", messageIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? admin.from("attachments").select("id, message_id, file_name, file_url, file_type, file_size").in("message_id", messageIds)
      : Promise.resolve({ data: [] as any[] }),
    messageIds.length
      ? admin.from("messages").select("thread_id").in("thread_id", messageIds).eq("is_deleted", false)
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

  return (
    <DmChat
      conversationId={conversation.id}
      boxId={conversation.box_id}
      isGroup={conversation.is_group}
      groupName={conversation.name}
      participants={participants}
      initialMessages={(messages || []).map((m: { id: string; content: string; created_at: string; is_edited: boolean; user_id: string | null }) => ({
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
