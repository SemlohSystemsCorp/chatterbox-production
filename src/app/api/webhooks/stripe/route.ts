import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === "active" || sub.status === "trialing";
      await supabase
        .from("boxes")
        .update({
          stripe_subscription_id: sub.id,
          plan: isActive ? "pro" : "free",
          max_seats: isActive ? 999999 : 20,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("boxes")
        .update({
          stripe_subscription_id: null,
          plan: "free",
          max_seats: 20,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.error(
        `[Stripe] Payment failed for customer ${invoice.customer} — invoice ${invoice.id}`
      );

      const { data: failedBox } = await supabase
        .from("boxes")
        .select("id, name, slug, created_by")
        .eq("stripe_customer_id", invoice.customer as string)
        .single();

      if (failedBox?.created_by) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", failedBox.created_by)
          .single();

        if (ownerProfile?.email) {
          const name = ownerProfile.display_name || "there";
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Chatterbox <billing@chatterbox.app>",
            to: ownerProfile.email,
            subject: `Payment failed for ${failedBox.name}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #0f0f0f; font-size: 20px; font-weight: 600; margin-bottom: 8px;">Payment failed</h2>
                <p style="color: #737373; font-size: 15px; margin-bottom: 24px;">
                  Hi ${name}, we weren't able to process payment for <strong>${failedBox.name}</strong>.
                  Please update your payment method to keep your Pro plan active.
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/box/${failedBox.slug}/settings"
                   style="display: inline-block; background: #0f0f0f; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                  Update payment method
                </a>
                <p style="color: #a1a1aa; font-size: 13px; margin-top: 32px;">
                  If your payment method isn't updated, your workspace will be downgraded to the free plan.
                </p>
              </div>
            `,
          }).catch(() => {});
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;

      // Reset monthly usage counters for the next billing cycle.
      if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_create") {
        await supabase.rpc("reset_call_minutes_for_box_customer", {
          customer_id: invoice.customer as string,
        });
      }

      // Send receipt email to the workspace owner
      const amountPaid = (invoice.amount_paid ?? 0) / 100;
      const currency = (invoice.currency ?? "usd").toUpperCase();

      const { data: paidBox } = await supabase
        .from("boxes")
        .select("id, name, slug, created_by")
        .eq("stripe_customer_id", invoice.customer as string)
        .single();

      if (paidBox?.created_by) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", paidBox.created_by)
          .single();

        if (ownerProfile?.email) {
          const name = ownerProfile.display_name || "there";
          const periodEnd = invoice.lines?.data?.[0]?.period?.end;
          const nextBilling = periodEnd
            ? new Date(periodEnd * 1000).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : null;

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Chatterbox <billing@chatterbox.app>",
            to: ownerProfile.email,
            subject: `Receipt for ${paidBox.name} — $${amountPaid.toFixed(2)} ${currency}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #0f0f0f; font-size: 20px; font-weight: 600; margin-bottom: 8px;">Payment receipt</h2>
                <p style="color: #737373; font-size: 15px; margin-bottom: 24px;">
                  Hi ${name}, here's your receipt for <strong>${paidBox.name}</strong>.
                </p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #737373; font-size: 14px;">Plan</span>
                    <span style="color: #0f0f0f; font-size: 14px; font-weight: 500;">Chatterbox Pro</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #737373; font-size: 14px;">Amount</span>
                    <span style="color: #0f0f0f; font-size: 14px; font-weight: 500;">$${amountPaid.toFixed(2)} ${currency}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #737373; font-size: 14px;">Workspace</span>
                    <span style="color: #0f0f0f; font-size: 14px; font-weight: 500;">${paidBox.name}</span>
                  </div>
                  ${nextBilling ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #737373; font-size: 14px;">Next billing date</span>
                    <span style="color: #0f0f0f; font-size: 14px; font-weight: 500;">${nextBilling}</span>
                  </div>
                  ` : ""}
                </div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/box/${paidBox.slug}/settings"
                   style="display: inline-block; background: #0f0f0f; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                  View workspace settings
                </a>
                <p style="color: #a1a1aa; font-size: 13px; margin-top: 32px;">
                  You can manage your subscription from your workspace settings at any time.
                </p>
              </div>
            `,
          }).catch(() => {});
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
