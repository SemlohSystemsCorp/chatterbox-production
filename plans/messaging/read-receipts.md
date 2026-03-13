# Read Receipts

## Overview
Show message authors who has seen their messages. Display subtle read indicators (like WhatsApp's blue checkmarks) and a "Seen by" list.

## User Stories
- As a message author, I want to know if my message has been read by the recipient(s).
- As a user, I want to see "Seen by X, Y, Z" on my messages in small groups/DMs.
- As a user, I want the option to disable read receipts for privacy.

## Database Changes

### New table: `message_reads`
```sql
CREATE TABLE message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Anyone in the channel can see reads
CREATE POLICY "Channel members can see reads" ON message_reads FOR SELECT
  USING (message_id IN (
    SELECT id FROM messages WHERE channel_id IN (SELECT get_user_channel_ids())
    UNION
    SELECT id FROM messages WHERE conversation_id IN (SELECT get_user_conversation_ids())
  ));

-- Users insert their own reads
CREATE POLICY "Users insert own reads" ON message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Optimize: batch queries by channel
CREATE INDEX idx_message_reads_message ON message_reads (message_id);
CREATE INDEX idx_message_reads_user ON message_reads (user_id, read_at DESC);
```

### Profile preference
```sql
ALTER TABLE profiles ADD COLUMN show_read_receipts BOOLEAN NOT NULL DEFAULT true;
```

## Architecture

### Tracking Reads
1. When a user views a channel/DM, client tracks which messages are visible in viewport
2. Uses `IntersectionObserver` to detect when messages scroll into view
3. Batches visible message IDs and sends a single "mark as read" call every 2 seconds
4. Server Action upserts into `message_reads` (ON CONFLICT DO NOTHING)

### Displaying Receipts
- **DMs (1:1):** Double checkmark (grey = delivered, blue = read) like WhatsApp
- **Group DMs (2-8 people):** "Seen by Alice, Bob" text below message
- **Channels (9+ people):** "Seen by 12 people" with hover to see names (or don't show at all — configurable)
- Only show on the latest message per author to reduce clutter

### Privacy Controls
- User can disable `show_read_receipts` in settings
- If disabled: their reads are NOT recorded, and they cannot see others' reads
- Reciprocal: if you turn off receipts, you also lose visibility into who read your messages

### Performance
- Don't query reads for every message — only for the last N messages in view
- Cache read status in Zustand store
- Real-time subscription on `message_reads` for the current channel
- Batch inserts to avoid per-message API calls

## UI Components

### Read Indicator (on messages)
- DMs: ✓✓ icon (grey/blue) next to timestamp
- Groups: "Seen by Alice, Bob +3" text, click to expand full list
- Only on user's own messages

### Read Receipt Popover
- Shows list of readers with avatars and read timestamps
- "X people haven't seen this" count

### Settings Toggle
- "Send read receipts" toggle in notification/privacy settings
- Explanation text: "When off, you won't send or receive read receipts"

## File Changes
- `supabase/migrations/00027_read_receipts.sql` — table + RLS + profile column
- `src/hooks/use-read-tracking.ts` — IntersectionObserver + batch reporting
- `src/components/read-indicator.tsx` — checkmark / "Seen by" display
- `src/components/read-receipt-popover.tsx` — full reader list
- `src/components/channel-chat.tsx` — integrate read tracking
- `src/components/dm-chat.tsx` — integrate read tracking
- `src/app/dashboard/settings/notifications/page.tsx` — add toggle

## Estimated Effort
- **Lines of code:** ~800–1,100
- **Complexity:** Medium
- **Dependencies:** IntersectionObserver API (universal browser support)

## Edge Cases
- User opens channel but doesn't scroll — only messages in viewport are marked read
- Deleted messages — ON DELETE CASCADE removes reads
- High-traffic channels — skip read receipts for channels with 50+ members (too noisy)
- Real-time updates — new reads should animate in smoothly
- User with receipts off joins group — other members' read counts unaffected
