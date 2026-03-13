"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const boxSlug = searchParams.get("boxSlug");

  if (!boxSlug) {
    return NextResponse.json({ error: "Missing boxSlug" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const admin = createAdminClient();
  const { data: box } = await admin
    .from("boxes")
    .select("id, slug, created_by, stripe_customer_id")
    .eq("slug", boxSlug)
    .single();

  if (!box) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (box.created_by !== user.id) {
    return NextResponse.json({ error: "Only the workspace owner can manage billing" }, { status: 403 });
  }

  if (!box.stripe_customer_id) {
    return NextResponse.redirect(new URL(`/box/${boxSlug}/upgrade`, req.url));
  }

  const origin = new URL(req.url).origin;

  const session = await stripe.billingPortal.sessions.create({
    customer: box.stripe_customer_id,
    return_url: `${origin}/box/${boxSlug}/settings`,
  });

  return NextResponse.redirect(session.url);
}
