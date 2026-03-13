-- ============================================
-- SCHEMA ADDITIONS
-- ============================================

-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Add entity_type to orgs
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'company'
  CHECK (entity_type IN ('company', 'startup', 'non_profit', 'education', 'government', 'personal', 'other'));

-- ============================================
-- HELPER FUNCTIONS (bypass RLS to avoid
-- infinite recursion in self-referencing policies)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid();
$$;

-- ============================================
-- FIX org_members (infinite recursion)
-- ============================================

DROP POLICY IF EXISTS "Org members can view memberships" ON public.org_members;
DROP POLICY IF EXISTS "Org owners/admins can manage members" ON public.org_members;

CREATE POLICY "Org members can view memberships"
  ON public.org_members FOR SELECT
  USING (
    org_id IN (SELECT public.get_user_org_ids())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can join orgs" ON public.org_members;
CREATE POLICY "Users can join orgs"
  ON public.org_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Org owners/admins can update members" ON public.org_members;
CREATE POLICY "Org owners/admins can update members"
  ON public.org_members FOR UPDATE
  USING (org_id IN (SELECT public.get_user_admin_org_ids()));

DROP POLICY IF EXISTS "Org owners/admins can remove members" ON public.org_members;
CREATE POLICY "Org owners/admins can remove members"
  ON public.org_members FOR DELETE
  USING (
    org_id IN (SELECT public.get_user_admin_org_ids())
    OR user_id = auth.uid()
  );

-- ============================================
-- FIX orgs SELECT (use helper for consistency)
-- ============================================

DROP POLICY IF EXISTS "Org members can view their org" ON public.orgs;

CREATE POLICY "Org members can view their org"
  ON public.orgs FOR SELECT
  USING (id IN (SELECT public.get_user_org_ids()));

-- ============================================
-- FIX org_invites (use helper + add UPDATE)
-- ============================================

DROP POLICY IF EXISTS "Org members can view invites" ON public.org_invites;

CREATE POLICY "Org members can view invites"
  ON public.org_invites FOR SELECT
  USING (
    org_id IN (SELECT public.get_user_org_ids())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can accept their invites" ON public.org_invites;
CREATE POLICY "Users can accept their invites"
  ON public.org_invites FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================
-- FIX conversation_members (infinite recursion)
-- ============================================

DROP POLICY IF EXISTS "Conversation members can view memberships" ON public.conversation_members;

CREATE POLICY "Conversation members can view memberships"
  ON public.conversation_members FOR SELECT
  USING (
    conversation_id IN (SELECT public.get_user_conversation_ids())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Conversation members can view conversations" ON public.conversations;

CREATE POLICY "Conversation members can view conversations"
  ON public.conversations FOR SELECT
  USING (id IN (SELECT public.get_user_conversation_ids()));

-- ============================================
-- MISSING INSERT / UPDATE / DELETE POLICIES
-- ============================================

-- boxes
DROP POLICY IF EXISTS "Org members can create boxes" ON public.boxes;
CREATE POLICY "Org members can create boxes"
  ON public.boxes FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Org owners/admins can update boxes" ON public.boxes;
CREATE POLICY "Org owners/admins can update boxes"
  ON public.boxes FOR UPDATE
  USING (org_id IN (SELECT public.get_user_admin_org_ids()));

-- box_members
DROP POLICY IF EXISTS "Org members can add box members" ON public.box_members;
CREATE POLICY "Org members can add box members"
  ON public.box_members FOR INSERT
  WITH CHECK (
    box_id IN (
      SELECT b.id FROM public.boxes b
      WHERE b.org_id IN (SELECT public.get_user_org_ids())
    )
  );

-- channels
DROP POLICY IF EXISTS "Org members can create channels" ON public.channels;
CREATE POLICY "Org members can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    box_id IN (
      SELECT b.id FROM public.boxes b
      WHERE b.org_id IN (SELECT public.get_user_org_ids())
    )
  );

DROP POLICY IF EXISTS "Org members can update channels" ON public.channels;
CREATE POLICY "Org members can update channels"
  ON public.channels FOR UPDATE
  USING (
    box_id IN (
      SELECT b.id FROM public.boxes b
      WHERE b.org_id IN (SELECT public.get_user_org_ids())
    )
  );

-- channel_members
DROP POLICY IF EXISTS "Authenticated users can join channels" ON public.channel_members;
CREATE POLICY "Authenticated users can join channels"
  ON public.channel_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own channel membership" ON public.channel_members;
CREATE POLICY "Users can update own channel membership"
  ON public.channel_members FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave channels" ON public.channel_members;
CREATE POLICY "Users can leave channels"
  ON public.channel_members FOR DELETE
  USING (user_id = auth.uid());

-- conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- conversation_members
DROP POLICY IF EXISTS "Authenticated users can add conversation members" ON public.conversation_members;
CREATE POLICY "Authenticated users can add conversation members"
  ON public.conversation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own conversation membership" ON public.conversation_members;
CREATE POLICY "Users can update own conversation membership"
  ON public.conversation_members FOR UPDATE
  USING (user_id = auth.uid());

-- calls
DROP POLICY IF EXISTS "Authenticated users can create calls" ON public.calls;
CREATE POLICY "Authenticated users can create calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Call starter can update call" ON public.calls;
CREATE POLICY "Call starter can update call"
  ON public.calls FOR UPDATE
  USING (started_by = auth.uid());

-- call_participants
DROP POLICY IF EXISTS "Authenticated users can join calls" ON public.call_participants;
CREATE POLICY "Authenticated users can join calls"
  ON public.call_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
CREATE POLICY "Users can view call participants"
  ON public.call_participants FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM public.calls WHERE channel_id IN (
        SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own participation" ON public.call_participants;
CREATE POLICY "Users can update own participation"
  ON public.call_participants FOR UPDATE
  USING (user_id = auth.uid());
