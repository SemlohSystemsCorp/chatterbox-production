# Pinned Messages

## Overview
Allow users to pin important messages to the top of a channel or DM for easy reference. Pinned messages are accessible via a dedicated panel.

## User Stories
- As a channel member, I want to pin important messages so they're easy to find.
- As a user, I want to view all pinned messages in one place.
- As a user, I want to click a pinned message to jump to it in the conversation.

## Database Changes

### New table: `pinned_messages`
```sql
CREATE TABLE pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);

ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can see pins" ON pinned_messages FOR SELECT
  USING (
    channel_id IN (SELECT get_user_channel_ids())
    OR conversation_id IN (SELECT get_user_conversation_ids())
  );

CREATE POLICY "Members can pin messages" ON pinned_messages FOR INSERT
  WITH CHECK (
    channel_id IN (SELECT get_user_channel_ids())
    OR conversation_id IN (SELECT get_user_conversation_ids())
  );

CREATE POLICY "Pin author or admin can unpin" ON pinned_messages FOR DELETE
  USING (auth.uid() = pinned_by);
```

## Architecture

### Pin Flow
1. User right-clicks or uses message action menu → "Pin message"
2. Server Action inserts into `pinned_messages`
3. System message: "Alice pinned a message" with link to original
4. Pin icon appears on the message in chat
5. Real-time update notifies all channel members

### Unpin Flow
1. User clicks "Unpin" on a pinned message (or from pin panel)
2. Server Action deletes from `pinned_messages`
3. System message: "Alice unpinned a message"

### Pinned Messages Panel
- Accessible via pin icon in channel header
- Lists all pinned messages in chronological order
- Each item shows: message content preview, author, pin date, "Jump to" link
- Unpin button on each item (for pin author or channel admin)

## UI Components

### Pin Icon on Messages
- Small pin icon next to pinned messages in the chat
- Tooltip: "Pinned by Alice on Jan 15"

### Pinned Messages Panel
- Slides in from right side
- Header: "Pinned Messages (N)"
- List of pinned message cards with full content
- Empty state: "No pinned messages yet"

## File Changes
- `supabase/migrations/00027_pinned_messages.sql` — table + RLS
- `src/components/pinned-messages-panel.tsx` — panel component
- `src/components/message-actions.tsx` — add pin/unpin action
- `src/components/channel-header.tsx` — pin icon with count badge
- `src/lib/supabase/pinned-messages.ts` — CRUD helpers

## Estimated Effort
- **Lines of code:** ~500–700
- **Complexity:** Low
- **Dependencies:** None

## Edge Cases
- Max pins per channel — limit to 50 to prevent abuse
- Pinning a deleted message — block if message is soft-deleted
- Pin permissions — any channel member can pin; only pin author or admin can unpin
