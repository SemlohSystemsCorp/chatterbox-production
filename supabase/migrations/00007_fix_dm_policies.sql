-- Fix DM (conversation) policies, missing org_invites INSERT, and Realtime publications.

-- ============================================
-- 1. FIX MESSAGES POLICIES
-- ============================================

-- Drop the old recursive messages SELECT policy from 00001
DROP POLICY IF EXISTS "Members can view messages in their channels" ON public.messages;

-- Ensure the correct messages SELECT policy exists (channel + conversation)
DROP POLICY IF EXISTS "Channel members can view messages" ON public.messages;
CREATE POLICY "Channel members can view messages"
  ON public.messages FOR SELECT
  USING (
    channel_id IN (SELECT public.get_user_channel_ids())
    OR
    conversation_id IN (SELECT public.get_user_conversation_ids())
  );

-- Messages INSERT: user must own the message + be a member of the channel/conversation
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
CREATE POLICY "Authenticated users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (channel_id IS NOT NULL AND channel_id IN (SELECT public.get_user_channel_ids()))
      OR
      (conversation_id IS NOT NULL AND conversation_id IN (SELECT public.get_user_conversation_ids()))
    )
  );

-- Messages UPDATE
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages DELETE
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. FIX CONVERSATION POLICIES
-- ============================================

-- Conversations INSERT (create DMs)
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversations SELECT
DROP POLICY IF EXISTS "Conversation members can view conversations" ON public.conversations;
CREATE POLICY "Conversation members can view conversations"
  ON public.conversations FOR SELECT
  USING (id IN (SELECT public.get_user_conversation_ids()));

-- Conversation_members INSERT (add users to DMs)
DROP POLICY IF EXISTS "Authenticated users can add conversation members" ON public.conversation_members;
CREATE POLICY "Authenticated users can add conversation members"
  ON public.conversation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation_members SELECT
DROP POLICY IF EXISTS "Conversation members can view memberships" ON public.conversation_members;
CREATE POLICY "Conversation members can view memberships"
  ON public.conversation_members FOR SELECT
  USING (
    conversation_id IN (SELECT public.get_user_conversation_ids())
    OR user_id = auth.uid()
  );

-- Conversation_members UPDATE
DROP POLICY IF EXISTS "Users can update own conversation membership" ON public.conversation_members;
CREATE POLICY "Users can update own conversation membership"
  ON public.conversation_members FOR UPDATE
  USING (user_id = auth.uid());

-- Conversation_members DELETE
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. ADD MISSING ORG_INVITES INSERT POLICY
-- ============================================

DROP POLICY IF EXISTS "Org owners/admins can create invites" ON public.org_invites;
CREATE POLICY "Org owners/admins can create invites"
  ON public.org_invites FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.get_user_admin_org_ids())
  );

-- Also allow org owners to delete invites
DROP POLICY IF EXISTS "Org owners/admins can delete invites" ON public.org_invites;
CREATE POLICY "Org owners/admins can delete invites"
  ON public.org_invites FOR DELETE
  USING (
    org_id IN (SELECT public.get_user_admin_org_ids())
  );

-- ============================================
-- 4. ENABLE REALTIME FOR DM TABLES
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
