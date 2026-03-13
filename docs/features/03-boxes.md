# Feature: Boxes (Workspaces)

## Overview
Boxes are workspaces within an organization. They contain channels and serve as the primary collaboration space. Think of them as Slack workspaces within an org.

## User Stories
- As an org admin, I can create a box
- As an org admin, I can configure box settings (name, description, icon)
- As an org admin, I can archive/delete a box
- As a member, I can switch between boxes in my org
- As a member, I see the box sidebar with channels list

## Technical Details

### Database Tables
```sql
CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TABLE public.box_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(box_id, user_id)
);
```

### Routes
- `/(dashboard)/org/[orgSlug]/box/[boxSlug]` — Box view with channel sidebar

### Business Rules
- Free plan orgs: 1 box max
- Pro/Enterprise: unlimited boxes
- All org members can access public channels in any box
- Archiving a box hides it but preserves data
