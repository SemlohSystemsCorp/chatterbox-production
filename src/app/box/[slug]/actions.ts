"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStorageAvailable, QuotaError } from "@/lib/billing";

export async function checkUploadAllowed(boxId: string, fileSizeBytes: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await assertStorageAvailable(boxId, fileSizeBytes);
    return { allowed: true };
  } catch (e) {
    if (e instanceof QuotaError) {
      return { allowed: false, error: e.message, upgradeUrl: e.upgradeUrl };
    }
    return { allowed: false, error: "Failed to check storage quota." };
  }
}

export async function createGroupDm(
  boxId: string,
  memberIds: string[],
  name?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (memberIds.length < 2) {
    return { error: "Select at least 2 people for a group conversation." };
  }

  // Verify the user is a member of this box
  const { data: membership } = await supabase
    .from("box_members")
    .select("id")
    .eq("box_id", boxId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You are not a member of this workspace." };
  }

  // Use admin client to bypass RLS (same pattern as 1:1 DM creation in layout)
  const admin = createAdminClient();

  const { data: conv, error: convError } = await admin
    .from("conversations")
    .insert({
      box_id: boxId,
      is_group: true,
      name: name || null,
    })
    .select("id, slug")
    .single();

  if (convError || !conv) {
    return { error: convError?.message || "Failed to create conversation." };
  }

  const allMemberIds = [...new Set([...memberIds, user.id])];
  const rows = allMemberIds.map((userId) => ({
    conversation_id: conv.id,
    user_id: userId,
  }));

  const { error: membersError } = await admin
    .from("conversation_members")
    .insert(rows);

  if (membersError) {
    return { error: membersError.message };
  }

  return { slug: conv.slug };
}
