# Chatterbox

A modern Slack alternative built for fast, clean communication.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase (Postgres, Realtime, Auth, Storage)
- **Payments:** Stripe (per-seat monthly billing)
- **Video/Audio:** Daily.co
- **Email:** Resend + React Email
- **State:** Zustand
- **Deployment:** Vercel

## Project Structure

```
src/
  app/              # Next.js App Router pages & layouts
    (auth)/         # Auth routes (sign-in, sign-up, callback, magic-link)
    (dashboard)/    # Authenticated app shell
    api/            # API routes (webhooks, etc.)
  components/       # Shared UI components
    ui/             # Base UI primitives (Button, Input, Modal, etc.)
  lib/              # Utilities, configs, helpers
    supabase/       # Supabase client (server/client/middleware)
    stripe/         # Stripe helpers
    daily/          # Daily.co helpers
    resend/         # Email templates & sending
  hooks/            # Custom React hooks
  stores/           # Zustand stores
  types/            # TypeScript type definitions
  constants/        # App constants
```

## Conventions

- Use `@/` import alias for all imports from `src/`
- Server Components by default; add `"use client"` only when needed
- Colocate related files (component + types + hooks in same directory when specific to that feature)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Name files in kebab-case, components in PascalCase, utilities in camelCase
- All Supabase queries go through typed helpers in `lib/supabase/`
- API routes handle webhooks; prefer Server Actions for mutations
- Environment variables prefixed with `NEXT_PUBLIC_` for client-side only

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Start production server
```

## Key Decisions

- Orgs are the billing entity (max 3 per user)
- Boxes (workspaces) belong to orgs, contain channels
- Channels can be public or private
- Real-time messaging via Supabase Realtime
- Threads, reactions, file uploads, message edit/delete all supported
- Daily.co for audio + video + screen sharing (1:1 and group)
- Resend for invite emails, magic links, billing receipts, digest summaries
