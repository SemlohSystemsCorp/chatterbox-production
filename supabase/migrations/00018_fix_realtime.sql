-- Fix Supabase Realtime delivery.
--
-- Root cause: Supabase's postgres_changes RLS filtering requires REPLICA IDENTITY FULL
-- on every table. Without it, the WAL doesn't include the full row, so Supabase can't
-- evaluate RLS policies on incoming changes and silently drops the events.
--
-- Fix plan:
--   1. Set REPLICA IDENTITY FULL on every table that has active subscriptions.
--   2. Ensure all required tables are in the supabase_realtime publication (idempotent).

-- ============================================
-- 1. REPLICA IDENTITY FULL
-- ============================================
ALTER TABLE public.messages           REPLICA IDENTITY FULL;
ALTER TABLE public.reactions          REPLICA IDENTITY FULL;
ALTER TABLE public.notifications      REPLICA IDENTITY FULL;
ALTER TABLE public.attachments        REPLICA IDENTITY FULL;
ALTER TABLE public.channels           REPLICA IDENTITY FULL;
ALTER TABLE public.channel_members    REPLICA IDENTITY FULL;
ALTER TABLE public.conversations      REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.profiles           REPLICA IDENTITY FULL;

-- ============================================
-- 2. ENSURE ALL TABLES ARE IN THE PUBLICATION
--    (idempotent — safe to re-run)
-- ============================================
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'messages',
    'reactions',
    'notifications',
    'attachments',
    'channels',
    'channel_members',
    'conversations',
    'conversation_members',
    'profiles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
