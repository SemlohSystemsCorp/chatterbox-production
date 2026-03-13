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
    .select("id, name, slug, created_by, stripe_customer_id, plan")
    .eq("slug", boxSlug)
    .single();

  if (!box) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (box.created_by !== user.id) {
    return NextResponse.json({ error: "Only the workspace owner can upgrade" }, { status: 403 });
  }

  if (box.plan === "pro") {
    return NextResponse.redirect(new URL(`/box/${boxSlug}/settings`, req.url));
  }

  // Get or create Stripe customer
  let customerId = box.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { box_id: box.id, box_slug: box.slug },
    });
    customerId = customer.id;

    await admin
      .from("boxes")
      .update({ stripe_customer_id: customerId })
      .eq("id", box.id);
  }

  // Count current members for per-seat billing
  const { count: memberCount } = await admin
    .from("box_members")
    .select("id", { count: "exact", head: true })
    .eq("box_id", box.id);

  const quantity = Math.max(memberCount ?? 1, 1);
  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity,
      },
    ],
    success_url: `${origin}/checkout/success?box=${boxSlug}`,
    cancel_url: `${origin}/box/${boxSlug}/upgrade`,
    subscription_data: {
      metadata: { box_id: box.id },
    },
  });

  return NextResponse.redirect(session.url!);
}
