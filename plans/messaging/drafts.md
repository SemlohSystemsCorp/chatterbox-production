# Drafts

## Overview
Auto-save unsent messages per channel/DM so users don't lose their work when navigating away.

## User Stories
- As a user, I want my unsent message to be preserved when I switch channels.
- As a user, I want to see a draft indicator on channels that have unsent messages.
- As a user, I want drafts to sync across devices.

## Technical Approach

### Two-Tier Storage
1. **Local (immediate):** `localStorage` for instant save/restore with no latency
2. **Remote (sync):** Supabase table for cross-device sync

### Local Storage (Primary)
```typescript
// Key format: draft:{channelId|conversationId}:{threadId?}
localStorage.setItem(`draft:${channelId}`, JSON.stringify({
  content: "Hey team, I was thinking...",
  updatedAt: Date.now(),
}));
```

### Remote Sync (Secondary)
```sql
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id, conversation_id, thread_id)
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drafts" ON drafts FOR ALL
  USING (auth.uid() = user_id);
```

## Architecture

### Auto-Save Flow
1. User types in message input
2. After 1 second of no typing (debounced), save to localStorage
3. After 5 seconds of no typing, sync to remote `drafts` table
4. On message send, clear both local and remote draft

### Restore Flow
1. User navigates to a channel
2. Check localStorage for draft — restore immediately
3. If no local draft, check remote `drafts` table (async)
4. Populate message input with draft content

### Draft Indicator
- Channels with drafts show a pencil icon and "Draft" label in sidebar
- Draft indicator sourced from localStorage for instant display

## UI Components

### Draft Indicator (Sidebar)
- Small pencil icon next to channel name
- Italic "Draft" text in grey
- Draft preview text (truncated)

### Message Input Enhancement
- Auto-restore draft on channel load
- Auto-save on input change (debounced)
- Clear draft on successful send
- "Draft saved" subtle indicator (optional)

## File Changes
- `supabase/migrations/00027_drafts.sql` — table + RLS
- `src/hooks/use-draft.ts` — auto-save/restore hook with localStorage + remote sync
- `src/components/channel-chat.tsx` — integrate draft hook
- `src/components/dm-chat.tsx` — integrate draft hook
- `src/components/box-sidebar.tsx` — show draft indicators

## Estimated Effort
- **Lines of code:** ~400–600
- **Complexity:** Low-Medium
- **Dependencies:** None

## Edge Cases
- Draft conflicts across devices — last-write-wins based on `updated_at`
- Very old drafts — show "You have a draft from 3 days ago" with option to discard
- Channel deleted — ON DELETE CASCADE removes draft
- Thread draft vs channel draft — stored separately via `thread_id`
- localStorage full — graceful fallback to remote-only
