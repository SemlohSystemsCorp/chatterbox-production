# Feature: Authentication

## Overview
User authentication via Supabase Auth with email/password, OAuth (Google, GitHub), and magic link sign-in.

## User Stories
- As a user, I can sign up with email and password
- As a user, I can sign in with email and password
- As a user, I can sign in with Google OAuth


- As a user, I can sign out
- As a user, I can reset my password
- As a user, I see my profile (avatar, display name, status)

## Technical Details

### Auth Provider: Supabase Auth
- Email/password with email confirmation
- OAuth providers: Google, GitHub
- Magic link via Resend (custom SMTP)
- Session management via `@supabase/ssr` (cookie-based)

### Database Tables
```sql
-- Supabase auth.users is automatic
-- We extend with a public profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  status_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Routes
- `/sign-up` — Registration form
- `/sign-in` — Login form (email/password + OAuth buttons + magic link)
- `/magic-link` — Magic link sent confirmation page
- `/callback` — OAuth callback handler
- `/api/auth/callback` — Server-side auth callback route

### Middleware
- Protect all `(dashboard)` routes — redirect to `/sign-in` if unauthenticated
- Redirect authenticated users away from `(auth)` routes to dashboard

### Components
- `SignUpForm` — email, password, confirm password, submit
- `SignInForm` — email, password, submit
- `OAuthButtons` — Google + GitHub sign-in buttons
- `MagicLinkForm` — email input, send magic link
- `UserAvatar` — displays user avatar with online/offline status
- `UserMenu` — dropdown with profile, settings, sign out

## Security
- Server-side session validation on every request via middleware
- PKCE flow for OAuth
- Rate limiting on auth endpoints (Supabase built-in)
- Passwords minimum 8 characters
