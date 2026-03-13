# Polls

## Overview
Allow users to create inline polls within channels and DMs. Members can vote, see results in real-time, and polls can be anonymous or public.

## User Stories
- As a user, I want to create a poll with multiple options to get team input on a decision.
- As a user, I want to vote on a poll by clicking an option.
- As a user, I want to see live results as votes come in.
- As a user, I want to create anonymous polls where votes aren't attributed.
- As a user, I want to allow single or multiple choice voting.

## Database Changes

### New tables: `polls`, `poll_options`, `poll_votes`
```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_multiple_choice BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, option_id, user_id)
);

-- RLS policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls visible to anyone who can see the message's channel
CREATE POLICY "Polls visible to channel members" ON polls FOR SELECT
  USING (message_id IN (
    SELECT id FROM messages WHERE channel_id IN (SELECT get_user_channel_ids())
  ));

-- Votes: users can insert/delete own, see all (unless anonymous)
CREATE POLICY "Users can vote" ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);
```

## Architecture

### Poll Creation Flow
1. User triggers poll creation via `/poll` command or "Create Poll" button
2. Modal opens with:
   - Question field
   - Dynamic option fields (add/remove, min 2, max 10)
   - Anonymous toggle
   - Multiple choice toggle
   - Optional closing time
3. Server Action creates a message with `type: 'poll'`, then creates poll + options
4. Poll renders inline in the message list

### Voting Flow
1. User clicks an option to vote
2. Client calls Server Action to insert `poll_votes`
3. Real-time subscription updates vote counts for all viewers
4. For single choice: clicking a different option moves the vote
5. For multiple choice: clicking toggles the vote on that option

### Results Display
- Bar chart next to each option showing percentage
- Total vote count
- If not anonymous: hover to see who voted for each option
- User's own vote highlighted
- Closed polls show final results with winner highlighted

## UI Components

### `CreatePollModal`
- Question input
- Dynamic list of option inputs (+ Add Option button)
- Toggle switches: Anonymous, Multiple Choice
- Optional: Close after [duration] picker
- Create / Cancel buttons

### `PollMessage` (renders inside message list)
- Question as heading
- Options as clickable bars with:
  - Option text
  - Vote count and percentage
  - Progress bar fill
  - Checkmark if user voted for it
- Footer: total votes, anonymous indicator, close time
- "End Poll" button for creator

## File Changes
- `supabase/migrations/00027_polls.sql` — tables + RLS
- `src/components/create-poll-modal.tsx` — poll creation UI
- `src/components/poll-message.tsx` — inline poll display
- `src/lib/supabase/polls.ts` — CRUD + voting helpers
- `src/components/channel-chat.tsx` — render PollMessage for poll-type messages

## Estimated Effort
- **Lines of code:** ~900–1,300
- **Complexity:** Medium
- **Dependencies:** Supabase Realtime for live vote updates

## Edge Cases
- User votes then leaves workspace — vote remains (orphaned but harmless)
- Poll creator deletes message — cascade deletes poll and votes
- Rapid double-click voting — UNIQUE constraint prevents duplicates
- Closed poll — disable voting buttons, show "Poll closed" label
- Very long option text — truncate with tooltip
