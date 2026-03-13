-- Notifications system: in-app notifications for DMs, thread replies, and mentions.

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('dm', 'mention', 'thread_reply')),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  body TEXT, -- preview of the message content
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_message ON public.notifications(message_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- TRIGGER: auto-create notifications on message insert
-- ============================================
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_ids UUID[];
BEGIN
  -- 1) DM notifications: notify all conversation members except sender
  IF NEW.conversation_id IS NOT NULL AND NEW.thread_id IS NULL THEN
    INSERT INTO public.notifications (user_id, type, message_id, actor_id, conversation_id, body)
    SELECT
      cm.user_id,
      'dm',
      NEW.id,
      NEW.user_id,
      NEW.conversation_id,
      LEFT(NEW.content, 120)
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.user_id;
  END IF;

  -- 2) Thread reply notifications: notify parent author + other thread participants
  IF NEW.thread_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message_id, actor_id, channel_id, conversation_id, body)
    SELECT DISTINCT
      m.user_id,
      'thread_reply',
      NEW.id,
      NEW.user_id,
      NEW.channel_id,
      NEW.conversation_id,
      LEFT(NEW.content, 120)
    FROM public.messages m
    WHERE (m.id = NEW.thread_id OR m.thread_id = NEW.thread_id)
      AND m.user_id IS NOT NULL
      AND m.user_id != NEW.user_id
      AND m.is_deleted = false;
  END IF;

  -- 3) @mention notifications: parse @username patterns from message content
  --    Matches word-boundary @username patterns (alphanumeric, underscores, hyphens, dots)
  IF NEW.content ~ '@[a-zA-Z0-9_.\-]+' THEN
    SELECT ARRAY_AGG(p.id) INTO mentioned_user_ids
    FROM public.profiles p
    WHERE p.username = ANY(
      SELECT (regexp_matches(NEW.content, '@([a-zA-Z0-9_.\-]+)', 'g'))[1]
    )
    AND p.id != NEW.user_id;

    IF mentioned_user_ids IS NOT NULL AND array_length(mentioned_user_ids, 1) > 0 THEN
      INSERT INTO public.notifications (user_id, type, message_id, actor_id, channel_id, conversation_id, body)
      SELECT
        uid,
        'mention',
        NEW.id,
        NEW.user_id,
        NEW.channel_id,
        NEW.conversation_id,
        LEFT(NEW.content, 120)
      FROM unnest(mentioned_user_ids) AS uid
      -- Avoid duplicate notifications: don't mention-notify if already notified via DM or thread
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.message_id = NEW.id AND n.user_id = uid
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notifications();

-- ============================================
-- ENABLE REALTIME for notifications
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
