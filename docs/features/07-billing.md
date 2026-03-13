# Feature: Billing

## Overview
Per-seat monthly billing via Stripe at the org level. Three tiers: Free, Pro, Enterprise.

## Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Seats | 5 | Unlimited | Unlimited |
| Boxes | 1 | Unlimited | Unlimited |
| File storage | 1 GB | 20 GB | 100 GB |
| Message history | 10K | Unlimited | Unlimited |
| Video calls | 1:1 only | Group | Group + recording |
| Support | Community | Priority | Dedicated |
| SSO | No | No | Yes |
| Price/seat/mo | $0 | $8 | $15 |

## User Stories
- As an org owner, I can view my current plan and usage
- As an org owner, I can upgrade/downgrade plans
- As an org owner, I can add/remove seats
- As an org owner, I can view billing history and invoices
- As an org owner, I can update payment method
- As an org owner, I receive billing receipts via email

## Technical Details

### Stripe Integration
- Stripe Checkout for initial subscription
- Stripe Customer Portal for plan management
- Stripe Webhooks for subscription lifecycle events
- Per-seat quantity billing (metered)

### Webhook Events
- `checkout.session.completed` — Activate subscription
- `customer.subscription.updated` — Plan/seat changes
- `customer.subscription.deleted` — Downgrade to free
- `invoice.payment_succeeded` — Send receipt email
- `invoice.payment_failed` — Notify org owner

### API Routes
- `POST /api/billing/checkout` — Create Stripe Checkout session
- `POST /api/billing/portal` — Create Stripe Customer Portal session
- `POST /api/webhooks/stripe` — Handle Stripe webhooks

### Components
- `BillingPage` — current plan, usage, upgrade buttons
- `PlanCard` — individual plan display with features
- `InvoiceHistory` — list of past invoices
- `SeatManager` — add/remove seats UI
