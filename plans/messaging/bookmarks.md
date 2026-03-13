# Bookmarks / Saved Items

## Overview
Let users save messages to a personal collection for quick reference later. Similar to Slack's "Save for later" feature.

## User Stories
- As a user, I want to bookmark important messages so I can find them quickly later.
- As a user, I want to view all my saved items in one place.
- As a user, I want to add a note to a bookmark to remind myself why I saved it.

## Database Changes

### New table: `bookmarks`
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_bookmarks_user ON bookmarks (user_id, created_at DESC);
```

## Architecture

### Bookmark Flow
1. User right-clicks or clicks bookmark icon on a message
2. Optionally adds a note
3. Client inserts into `bookmarks` table
4. Bookmark icon appears filled on the message to indicate saved state

### Viewing Saved Items
- New page at `/dashboard/saved` or `/box/[slug]/saved`
- Lists all bookmarks with message preview, channel/DM context, and note
- Click to jump to message in its original context
- Filter by workspace, search within bookmarks

## UI Components

### Bookmark Action (on message hover)
- Bookmark icon (outline when not saved, filled when saved)
- Click to toggle bookmark
- Long-press or right-click to add/edit note

### Saved Items Page
- List view with:
  - Message content preview (truncated)
  - Author avatar + name
  - Channel/DM name + workspace
  - Bookmark note (if any)
  - Timestamp of bookmark
  - "Jump to message" link
  - Remove bookmark button
- Search bar to filter saved items
- Sort by: newest first, oldest first

## File Changes
- `supabase/migrations/00027_bookmarks.sql` — new table + RLS
- `src/components/message-actions.tsx` — add bookmark button to message hover actions
- `src/components/bookmark-note-modal.tsx` — modal for adding/editing notes
- `src/app/dashboard/saved/page.tsx` — saved items page
- `src/lib/supabase/bookmarks.ts` — CRUD helpers

## Estimated Effort
- **Lines of code:** ~500–700
- **Complexity:** Low
- **Dependencies:** None

## Edge Cases
- Message is deleted after bookmarking — show "This message was deleted" placeholder
- User bookmarks a message in a channel they later leave — still show in saved items but "Jump to message" may fail
- Duplicate bookmark attempts — UNIQUE constraint handles this, upsert on toggle
