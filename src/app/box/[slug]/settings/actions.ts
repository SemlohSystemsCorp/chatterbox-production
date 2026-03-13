"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncStripeSeats } from "@/lib/billing";

async function requireBoxOwner(boxId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, slug, name, created_by")
    .eq("id", boxId)
    .single();

  if (!box) throw new Error("Box not found.");

  // Check if user is a member (for update access)
  const { data: membership } = await supabase
    .from("box_members")
    .select("id")
    .eq("box_id", boxId)
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new Error("Access denied.");

  return { supabase, user, box, isOwner: box.created_by === user.id };
}

export async function updateBox(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string).trim();

  if (!name) throw new Error("Name is required.");

  const { supabase } = await requireBoxOwner(boxId);

  const { error } = await supabase
    .from("boxes")
    .update({ name, description: description || null })
    .eq("id", boxId);

  if (error) throw new Error(error.message);

  revalidatePath(`/box/[slug]/settings`, "page");
}

export async function updateBoxColor(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const color = formData.get("color") as string;

  const { supabase, isOwner } = await requireBoxOwner(boxId);
  if (!isOwner) throw new Error("Only the workspace owner can change the color.");

  const { error } = await supabase
    .from("boxes")
    .update({ color })
    .eq("id", boxId);

  if (error) throw new Error(error.message);

  revalidatePath(`/box/[slug]/settings`, "page");
}

export async function removeBoxMember(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const targetUserId = formData.get("userId") as string;

  const { supabase, user, box, isOwner } = await requireBoxOwner(boxId);
  if (!isOwner) throw new Error("Only the workspace owner can remove members.");
  if (targetUserId === user.id) throw new Error("You cannot remove yourself.");
  if (targetUserId === box.created_by) throw new Error("You cannot remove the workspace owner.");

  const { error } = await supabase
    .from("box_members")
    .delete()
    .eq("box_id", boxId)
    .eq("user_id", targetUserId);

  if (error) throw new Error(error.message);

  // Update Stripe subscription quantity (no-ops on free plan)
  syncStripeSeats(boxId).catch(() => {});

  revalidatePath(`/box/[slug]/settings`, "page");
}

export async function archiveBox(formData: FormData) {
  const boxId = formData.get("boxId") as string;

  const { supabase } = await requireBoxOwner(boxId);

  const { error } = await supabase
    .from("boxes")
    .update({ is_archived: true })
    .eq("id", boxId);

  if (error) throw new Error(error.message);

  redirect("/dashboard");
}

export async function deleteBox(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const boxName = formData.get("boxName") as string;
  const confirmation = formData.get("confirmation") as string;

  if (confirmation !== boxName) throw new Error("Confirmation text does not match.");

  const { supabase, isOwner } = await requireBoxOwner(boxId);

  if (!isOwner) throw new Error("Only the workspace owner can delete it.");

  const { error } = await supabase.from("boxes").delete().eq("id", boxId);
  if (error) throw new Error(error.message);

  redirect("/dashboard");
}
