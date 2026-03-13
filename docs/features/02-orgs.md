# Feature: Organizations

## Overview
Organizations are the top-level entity in Chatterbox. They own boxes (workspaces), manage billing, and control membership. Users can belong to a maximum of 3 organizations.

## User Stories
- As a user, I can create an organization (up to 3)
- As an org owner, I can invite members via email
- As an org owner, I can remove members
- As an org owner, I can transfer ownership
- As an org admin, I can manage org settings (name, logo, etc.)
- As a member, I can leave an organization
- As a user, I can switch between my organizations

## Technical Details

### Database Tables
```sql
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_seats INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Roles
- **Owner**: Full control, billing, can delete org
- **Admin**: Manage members, boxes, channels, settings
- **Member**: Use boxes, channels, messaging

### Business Rules
- Max 3 orgs per user (enforced via DB constraint + app logic)
- Free plan: 5 seats, 1 box
- Pro plan: unlimited seats, unlimited boxes
- Enterprise plan: unlimited + SSO, audit logs, compliance
