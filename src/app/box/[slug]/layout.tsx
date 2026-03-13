import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoxSidebar } from "./box-sidebar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: box } = await supabase
    .from("boxes")
    .select("name")
    .eq("slug", slug)
    .single();
  const name = box?.name ?? slug;
  return {
    title: {
      default: name,
      template: `%s · ${name}`,
    },
  };
}

export default async function BoxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch box by slug
  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .eq("is_archived", false)
    .single();

  if (!box) {
    notFound();
  }

  // Verify user is a member of this box
  const { data: boxMembership } = await supabase
    .from("box_members")
    .select("id")
    .eq("box_id", box.id)
    .eq("user_id", user.id)
    .single();

  if (!boxMembership) {
    notFound();
  }

  // Fetch ALL channels in this box
  const { data: allChannels } = await supabase
    .from("channels")
    .select("id, name, slug, is_private, is_archived")
    .eq("box_id", box.id)
    .eq("is_archived", false)
    .order("name");

  // Fetch user's channel memberships in this box
  const channelIds = (allChannels || []).map((c) => c.id);
  const { data: myChannelMemberships } = channelIds.length
    ? await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("user_id", user.id)
        .in("channel_id", channelIds)
    : { data: [] };

  const myChannelIds = new Set((myChannelMemberships || []).map((m) => m.channel_id));

  // Auto-join all PUBLIC channels the user isn't already in
  const publicChannelsToJoin = (allChannels || []).filter(
    (c) => !c.is_private && !myChannelIds.has(c.id)
  );

  if (publicChannelsToJoin.length > 0) {
    await supabase.from("channel_members").insert(
      publicChannelsToJoin.map((c) => ({
        channel_id: c.id,
        user_id: user.id,
      }))
    );
    // Add them to the set so sidebar reflects it
    publicChannelsToJoin.forEach((c) => myChannelIds.add(c.id));
  }

  // Build visible channels list:
  // - All public channels (user is now a member of all of them)
  // - Private channels ONLY if user is a member
  const visibleChannels = (allChannels || []).filter(
    (c) => !c.is_private || myChannelIds.has(c.id)
  );

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch all box members for DMs — use admin client to bypass RLS
  const admin = createAdminClient();

  const { data: boxMembers } = await admin
    .from("box_members")
    .select("user_id")
    .eq("box_id", box.id);

  const otherMemberIds = (boxMembers || [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => id !== user.id) as string[];

  // Auto-create DM conversations with all box members
  // Fetch ALL 1:1 conversations in this box (admin sees everything)
  const { data: allDmConversations } = await admin
    .from("conversations")
    .select("id, slug, conversation_members(user_id)")
    .eq("box_id", box.id)
    .eq("is_group", false);

  // Build a map of sorted user-pair keys → conversation { id, slug }
  // This lets us detect duplicates and find existing DMs for any pair
  const pairMap: Record<string, { id: string; slug: string }> = {};
  const duplicateIds: string[] = [];

  (allDmConversations || []).forEach((conv: { id: string; slug: string; conversation_members: { user_id: string }[] }) => {
    const members = conv.conversation_members || [];
    if (members.length === 2) {
      const key = [members[0].user_id, members[1].user_id].sort().join(":");
      if (pairMap[key]) {
        // Duplicate — mark for cleanup
        duplicateIds.push(conv.id);
      } else {
        pairMap[key] = { id: conv.id, slug: conv.slug };
      }
    }
  });

  // Clean up duplicate 1:1 conversations
  if (duplicateIds.length > 0) {
    await admin.from("conversations").delete().in("id", duplicateIds);
  }

  // Build dmMap for current user (partner → { id, slug })
  const dmMap: Record<string, { id: string; slug: string }> = {};

  for (const [key, conv] of Object.entries(pairMap)) {
    const [a, b] = key.split(":");
    if (a === user.id) dmMap[b] = conv;
    else if (b === user.id) dmMap[a] = conv;
  }

  // Create missing DM conversations for current user
  // (slug is auto-generated by the DB trigger)
  for (const partnerId of otherMemberIds) {
    if (!dmMap[partnerId]) {
      const { data: conv } = await admin
        .from("conversations")
        .insert({ box_id: box.id, is_group: false })
        .select("id, slug")
        .single();

      if (conv) {
        await admin.from("conversation_members").insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: partnerId },
        ]);
        dmMap[partnerId] = { id: conv.id, slug: conv.slug };
      }
    }
  }

  // Build DM sidebar data from dmMap
  const dmPartnerIds = Object.keys(dmMap);

  const { data: dmProfiles } = dmPartnerIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, username, avatar_url, status")
        .in("id", dmPartnerIds)
    : { data: [] };

  const directMessages = (dmProfiles || []).map((p: { id: string; display_name: string | null; username: string | null; avatar_url: string | null; status: string }) => ({
    conversationId: dmMap[p.id].id,
    slug: dmMap[p.id].slug,
    userId: p.id,
    displayName: p.display_name,
    username: p.username,
    avatarUrl: p.avatar_url,
    status: p.status,
  }));

  // Fetch group DM conversations the user is part of
  const { data: groupConversations } = await admin
    .from("conversations")
    .select("id, slug, name, conversation_members(user_id)")
    .eq("box_id", box.id)
    .eq("is_group", true);

  const myGroupConvs = (groupConversations || []).filter((conv: { id: string; slug: string; name: string | null; conversation_members: { user_id: string }[] }) => {
    const members = conv.conversation_members || [];
    return members.some((m) => m.user_id === user.id);
  });

  // Collect all member user IDs from group convos for profile lookup
  const groupMemberIds = new Set<string>();
  myGroupConvs.forEach((conv: { id: string; slug: string; name: string | null; conversation_members: { user_id: string }[] }) => {
    const members = conv.conversation_members || [];
    members.forEach((m: { user_id: string }) => {
      if (m.user_id !== user.id) groupMemberIds.add(m.user_id);
    });
  });

  const { data: groupMemberProfiles } = groupMemberIds.size > 0
    ? await admin
        .from("profiles")
        .select("id, display_name, username, avatar_url, status")
        .in("id", [...groupMemberIds])
    : { data: [] };

  const groupProfileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null; status: string }> = {};
  (groupMemberProfiles || []).forEach((p: { id: string; display_name: string | null; username: string | null; avatar_url: string | null; status: string }) => {
    groupProfileMap[p.id] = p;
  });

  const groupDms = myGroupConvs.map((conv: { id: string; slug: string; name: string | null; conversation_members: { user_id: string }[] }) => {
    const members = conv.conversation_members || [];
    const otherMembers = members
      .filter((m: { user_id: string }) => m.user_id !== user.id)
      .map((m: { user_id: string }) => {
        const p = groupProfileMap[m.user_id];
        return {
          userId: m.user_id,
          displayName: p?.display_name || null,
          username: p?.username || null,
          avatarUrl: p?.avatar_url || null,
        };
      });
    return {
      conversationId: conv.id,
      slug: conv.slug,
      name: conv.name,
      members: otherMembers,
    };
  });

  // Fetch initial unread counts
  const conversationIdList = [
    ...Object.values(dmMap).map((c) => c.id),
    ...myGroupConvs.map((c: { id: string }) => c.id),
  ];
  const { data: unreadData } = await (supabase as any).rpc("get_unread_counts", {
    p_user_id: user.id,
    p_channel_ids: visibleChannels.map((c) => c.id),
    p_conversation_ids: conversationIdList,
  });
  const channelUnreads: Record<string, number> = {};
  const dmUnreads: Record<string, number> = {};
  ((unreadData as any[]) || []).forEach((row) => {
    if (row.item_type === "channel") channelUnreads[row.item_id] = Number(row.unread_count);
    else dmUnreads[row.item_id] = Number(row.unread_count);
  });

  // Build all box member profiles for the create-group-dm modal
  const allMemberIds = (boxMembers || []).map((m: { user_id: string }) => m.user_id).filter(Boolean) as string[];
  const { data: allMemberProfiles } = allMemberIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", allMemberIds)
    : { data: [] };

  const boxMembersList = (allMemberProfiles || []).map((p: { id: string; display_name: string | null; username: string | null; avatar_url: string | null }) => ({
    userId: p.id,
    displayName: p.display_name,
    username: p.username,
    avatarUrl: p.avatar_url,
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <BoxSidebar
        box={{ id: box.id, name: box.name, slug: box.slug, description: box.description }}
        channels={visibleChannels.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          is_private: c.is_private,
        }))}
        directMessages={directMessages}
        groupDms={groupDms}
        boxMembers={boxMembersList}
        currentUserId={user.id}
        channelUnreads={channelUnreads}
        dmUnreads={dmUnreads}
        profile={profile ? {
          id: user.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          email: profile.email,
          status: profile.status,
        } : null}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
