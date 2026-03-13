# Message Scheduling

## Overview
Allow users to compose a message and schedule it to be sent at a future date/time. Useful for async teams across time zones.

## User Stories
- As a user, I want to write a message now and have it sent tomorrow morning so my teammate sees it at the start of their day.
- As a user, I want to see and manage my scheduled messages so I can edit or cancel them before they send.
- As a user, I want to pick from suggested times (e.g. "Tomorrow at 9am", "Monday at 9am") for quick scheduling.

## Database Changes

### New table: `scheduled_messages`
```sql
CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only see/manage their own scheduled messages
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled messages"
  ON scheduled_messages FOR ALL
  USING (auth.uid() = user_id);

-- Index for the cron job that sends messages
CREATE INDEX idx_scheduled_messages_pending
  ON scheduled_messages (scheduled_at)
  WHERE status = 'pending';
```

## Architecture

### Scheduling Flow
1. User composes message and clicks schedule button (next to send)
2. Date/time picker appears with quick options + custom picker
3. Client calls Server Action to insert into `scheduled_messages`
4. A Supabase Edge Function (cron) runs every minute, queries pending messages where `scheduled_at <= now()`
5. For each due message, insert into `messages` table (same as normal send) and update status to `sent`
6. If insert fails, mark as `failed` with error info

### Cron Job: `send-scheduled-messages`
```typescript
// supabase/functions/send-scheduled-messages/index.ts
// Runs every minute via pg_cron or Supabase scheduled function

async function handler() {
  const { data: due } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(100);

  for (const msg of due) {
    try {
      await supabase.from('messages').insert({
        user_id: msg.user_id,
        channel_id: msg.channel_id,
        conversation_id: msg.conversation_id,
        thread_id: msg.thread_id,
        content: msg.content,
      });
      await supabase.from('scheduled_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', msg.id);
    } catch (err) {
      await supabase.from('scheduled_messages')
        .update({ status: 'failed' })
        .eq('id', msg.id);
    }
  }
}
```

## UI Components

### Schedule Button (next to Send)
- Dropdown with quick options:
  - "Later today" (next round hour)
  - "Tomorrow at 9:00 AM"
  - "Next Monday at 9:00 AM"
  - "Custom date & time..."
- Custom picker: date input + time input with timezone display

### Scheduled Messages Manager
- Accessible from sidebar or user menu
- List of pending scheduled messages with:
  - Preview of content
  - Target channel/DM
  - Scheduled time
  - Edit / Reschedule / Cancel actions

## File Changes
- `supabase/migrations/00027_scheduled_messages.sql` — new table + RLS
- `src/app/box/[slug]/c/[channelSlug]/page.tsx` — add schedule button to message composer
- `src/components/schedule-message-picker.tsx` — date/time picker dropdown
- `src/components/scheduled-messages-list.tsx` — manage scheduled messages
- `src/lib/supabase/scheduled-messages.ts` — CRUD helpers
- `supabase/functions/send-scheduled-messages/index.ts` — cron function

## Estimated Effort
- **Lines of code:** ~800–1,200
- **Complexity:** Medium
- **Dependencies:** Supabase Edge Functions or pg_cron for scheduled execution

## Edge Cases
- User deletes their account before message sends — cascade delete handles this
- Channel is deleted before message sends — ON DELETE CASCADE, message is lost (acceptable)
- User loses access to channel before send time — cron should verify membership before inserting
- Timezone handling — store all times in UTC, display in user's local timezone
- Attachments on scheduled messages — v2 feature, skip for MVP
