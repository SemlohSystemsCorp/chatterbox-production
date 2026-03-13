# Forward Messages

## Overview
Allow users to share/forward a message from one channel or DM to another, preserving the original author and content.

## User Stories
- As a user, I want to forward a message to another channel to share relevant information.
- As a user, I want to forward a message to a DM to discuss it privately.
- As a user, I want to add a comment when forwarding a message.

## Database Changes

```sql
-- Add forwarding reference to messages table
ALTER TABLE messages ADD COLUMN forwarded_from_id UUID REFERENCES messages(id) ON DELETE SET NULL;
```

## Architecture

### Forward Flow
1. User clicks "Forward" in message action menu
2. Channel/DM picker modal opens (search + recent destinations)
3. User selects destination and optionally adds a comment
4. Server Action creates a new message in the destination:
   - `content`: user's comment (if any)
   - `forwarded_from_id`: original message ID
5. Forwarded message renders with original content embedded as a quote block

### Display
- Forwarded messages show as a quote card:
  ```
  Alice forwarded a message:
  ┌────────────────────────────────────┐
  │ Bob · #engineering · 2h ago        │
  │ "We should refactor the auth flow" │
  └────────────────────────────────────┘
  Alice: What do you think about this?
  ```
- Click the quote card to jump to the original message (if user has access)
- If user doesn't have access to the source channel, show content but no "Jump to" link

## UI Components

### Forward Modal
- Search bar to find channels and DMs
- Recent destinations list
- Selected destination preview
- Optional comment input
- Forward button

### Forwarded Message Card
- Embedded quote with original author, source, timestamp
- Original message content
- Click to navigate to source

## File Changes
- `supabase/migrations/00027_forward_messages.sql` — add column
- `src/components/forward-message-modal.tsx` — destination picker
- `src/components/forwarded-message-card.tsx` — quote card display
- `src/components/message-actions.tsx` — add forward action
- `src/components/channel-chat.tsx` — render forwarded messages

## Estimated Effort
- **Lines of code:** ~500–700
- **Complexity:** Low-Medium
- **Dependencies:** None

## Edge Cases
- Original message deleted — show "Original message was deleted" in quote
- Forward to channel user isn't a member of — block with error
- Forward chain (forwarding a forward) — show the original source, not the intermediate
- Private channel message forwarded to public channel — check permissions, warn user
