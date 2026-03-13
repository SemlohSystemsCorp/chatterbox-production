# Feature: Email Notifications

## Overview
Transactional emails via Resend + React Email for invite notifications, magic links, billing receipts, and digest summaries.

## Email Types

### 1. Magic Link
- **Trigger:** User requests magic link sign-in
- **Content:** One-click sign-in button with tokenized URL
- **Template:** Clean, branded, single CTA

### 2. Org Invite
- **Trigger:** User is invited to an organization
- **Content:** Inviter name, org name, accept button
- **Template:** Shows org logo, inviter avatar

### 3. Billing Receipt
- **Trigger:** Successful invoice payment (Stripe webhook)
- **Content:** Amount, plan, period, invoice link
- **Template:** Clean receipt format

### 4. Digest Summary
- **Trigger:** Daily/weekly cron (user preference)
- **Content:** Unread message count per channel, highlights
- **Template:** Summary cards per channel with snippets

## Technical Details

### Resend Setup
- Send via Resend API (`resend.emails.send()`)
- Templates built with `@react-email/components`
- Custom domain for deliverability

### Email Templates (React Email)
- `MagicLinkEmail` — sign-in magic link
- `OrgInviteEmail` — org invitation
- `BillingReceiptEmail` — payment receipt
- `DigestEmail` — activity digest summary

### API
- `lib/resend/send-magic-link.ts`
- `lib/resend/send-invite.ts`
- `lib/resend/send-receipt.ts`
- `lib/resend/send-digest.ts`
