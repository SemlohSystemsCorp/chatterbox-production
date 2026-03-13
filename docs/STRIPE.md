# Stripe Setup Guide

Chatterbox uses Stripe for per-seat Pro billing ($8/seat/month). Orgs are the billing entity — admins manage payment for their org.

## Plans

| Plan | Price | Seats | Call minutes |
|------|-------|-------|-------------|
| Free | $0 | 20 | 5,000/month |
| Pro  | $8/seat/month | Unlimited | Unlimited |

---

## 1. Create the Product & Price in Stripe

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **Add product**
   - Name: `Chatterbox Pro`
   - Pricing model: **Per unit**
   - Price: `$8.00 USD` / month
   - Usage: **Licensed** (not metered)
3. Save and copy the **Price ID** (starts with `price_`)
4. Add it to `.env.local`:
   ```
   STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
   ```

---

## 2. Set Up Webhook (Production)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. After saving, reveal and copy the **Signing secret** (starts with `whsec_`)
4. Add it to your production environment:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

---

## 3. Local Development with Stripe CLI

### Install

```bash
brew install stripe/stripe-cli/stripe
```

### Login

```bash
stripe login
```

This opens a browser to authenticate with your Stripe account.

### Forward webhooks to localhost

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will print a webhook signing secret that starts with `whsec_`. Copy it and add to `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # from stripe listen output
```

Keep this terminal running while developing. Every Stripe event will be forwarded to your local server.

### Trigger test events

In a separate terminal:

```bash
# Simulate a subscription being created
stripe trigger customer.subscription.created

# Simulate a payment failure
stripe trigger invoice.payment_failed
```

---

## 4. Creating a Checkout Session (to implement)

When an org admin wants to upgrade, create a Stripe Checkout session pointing at the Pro price:

```typescript
// Example — add to a Server Action or API route
import { stripe } from "@/lib/stripe";

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: org.stripe_customer_id ?? undefined,
  line_items: [
    {
      price: process.env.STRIPE_PRO_PRICE_ID!,
      quantity: memberCount, // bill for current seat count
    },
  ],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/${org.slug}?upgraded=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/${org.slug}/settings/billing`,
  metadata: { org_id: org.id },
});
```

After checkout, Stripe fires `customer.subscription.created` → our webhook at `/api/webhooks/stripe` upgrades the org to Pro.

---

## 5. Billing Portal (to implement)

Let admins manage their subscription (cancel, update payment method, view invoices):

```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: org.stripe_customer_id!,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/${org.slug}/settings/billing`,
});

redirect(portalSession.url);
```

---

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...         # from Stripe Dashboard → API keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...       # from webhook endpoint or `stripe listen`
STRIPE_PRO_PRICE_ID=price_...         # from the Pro product you created
```
