# Feature: Direct Messages

## Overview
1:1 and group direct messages between users, separate from channels.

## User Stories
- As a member, I can send a direct message to another user
- As a member, I can create a group DM (up to 8 people)
- As a member, I see DMs in my sidebar
- As a member, I get real-time updates for DMs

## Technical Details

### Database Tables
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  name TEXT, -- only for group DMs
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- DM messages use the same messages table with a nullable conversation_id
ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
```

### Components
- `DMSidebar` — list of recent conversations
- `DMView` — conversation message view (reuses MessageList)
- `NewDMModal` — user search to start a DM
