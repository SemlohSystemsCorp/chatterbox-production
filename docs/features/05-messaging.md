# Feature: Messaging

## Overview
Real-time messaging is the core of Chatterbox. Messages support threads, reactions, file uploads, editing, and deleting. Powered by Supabase Realtime.

## User Stories
- As a member, I can send messages in a channel
- As a member, I see messages appear in real-time
- As a member, I can edit my own messages
- As a member, I can delete my own messages
- As an admin, I can delete any message
- As a member, I can reply in a thread
- As a member, I can react to messages with emoji
- As a member, I can upload files/images in messages
- As a member, I can mention @users and @channel
- As a member, I can search messages
- As a member, I see typing indicators

## Technical Details

### Database Tables
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_messages_channel_created ON public.messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_reactions_message ON public.reactions(message_id);
```

### Real-time
- Subscribe to Supabase Realtime channel per channel_id
- Listen for INSERT, UPDATE, DELETE on messages table
- Presence tracking for typing indicators and online status

### Components
- `MessageList` — virtualized, infinite-scroll message list
- `MessageItem` — single message with avatar, reactions, thread count
- `MessageInput` — rich text input with emoji picker, file upload, mentions
- `ThreadPanel` — slide-out panel showing thread replies
- `ReactionPicker` — emoji picker for reactions
- `FileUpload` — drag & drop + click to upload
- `TypingIndicator` — "User is typing..." display

### Performance
- Paginated message loading (50 per page, infinite scroll up)
- Optimistic updates for sent messages
- Virtual scrolling for large message histories
- File uploads to Supabase Storage with signed URLs
