# Channel Topics & Descriptions

## Overview
Allow channel admins to set a topic and description for channels, displayed as a banner at the top of the channel view.

## User Stories
- As a channel admin, I want to set a topic so members know what the channel is currently focused on.
- As a user, I want to see the channel topic at the top of the chat.
- As a user, I want to click the topic to see the full channel description.

## Database Changes

```sql
-- channels table likely already has a description column; add topic
ALTER TABLE channels ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS topic_set_by UUID REFERENCES auth.users(id);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS topic_set_at TIMESTAMPTZ;
```

## Architecture

### Setting Topic
1. Channel admin clicks "Edit topic" in channel header or uses `/topic` command
2. Inline text input appears in the header
3. On save, update `channels.topic` via Server Action
4. System message posted: "Alice set the topic to: Sprint 42 planning"
5. Real-time update pushes new topic to all channel members

### Display
- Topic shown in channel header bar, below channel name
- Truncated to one line with "..." — click to expand
- Click channel name to open info panel with full description
- Description supports markdown formatting

## UI Components

### Channel Header (updated)
```
┌──────────────────────────────────────────┐
│ # general                          ⓘ 👥  │
│ Sprint 42 planning — click to edit       │
└──────────────────────────────────────────┘
```

### Channel Info Panel
- Slides in from right (or modal)
- Shows: channel name, topic, full description, created by, member count
- Edit buttons for admins

## File Changes
- `supabase/migrations/00027_channel_topics.sql` — add columns
- `src/components/channel-header.tsx` — display and edit topic
- `src/components/channel-info-panel.tsx` — full channel details
- `src/components/channel-chat.tsx` — integrate header

## Estimated Effort
- **Lines of code:** ~400–600
- **Complexity:** Low
- **Dependencies:** None
