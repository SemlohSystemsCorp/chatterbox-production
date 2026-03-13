# Feature: Channels

## Overview
Channels are where conversations happen within a box. They can be public (visible to all box members) or private (invite-only).

## User Stories
- As a member, I can create a public or private channel
- As a member, I can browse and join public channels
- As a channel creator, I can invite members to a private channel
- As a member, I can leave a channel
- As an admin, I can archive/delete a channel
- As a member, I can set channel topic and description
- As a member, I see unread indicators on channels with new messages

## Technical Details

### Database Tables
```sql
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(box_id, slug)
);

CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  notifications TEXT DEFAULT 'all' CHECK (notifications IN ('all', 'mentions', 'none')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
```

### Components
- `ChannelSidebar` — list of channels with unread badges
- `ChannelHeader` — channel name, topic, member count, call button
- `ChannelBrowser` — browse/search public channels to join
- `CreateChannelModal` — name, description, public/private toggle

### Unread Tracking
- `last_read_at` on channel_members compared against latest message timestamp
- Unread count computed via query or maintained in a materialized view
