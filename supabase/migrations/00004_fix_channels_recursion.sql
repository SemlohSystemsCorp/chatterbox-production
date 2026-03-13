-- Fix infinite recursion in channels and channel_members SELECT policies.
-- The original policies join boxes → org_members, which triggers RLS on
-- org_members, which can circle back. We replace them with SECURITY DEFINER
-- helpers that bypass RLS.

-- Helper: get box IDs the current user has access to (via org membership)
CREATE OR REPLACE FUNCTION public.get_user_box_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.id
  FROM public.boxes b
  WHERE b.org_id IN (SELECT public.get_user_org_ids())
    AND b.is_archived = false;
$$;

-- Helper: get channel IDs the current user is a member of
CREATE OR REPLACE FUNCTION public.get_user_channel_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cm.channel_id
  FROM public.channel_members cm
  WHERE cm.user_id = auth.uid();
$$;

-- Fix channels SELECT policy
DROP POLICY IF EXISTS "Members can view public channels in their boxes" ON public.channels;
CREATE POLICY "Members can view public channels in their boxes"
  ON public.channels FOR SELECT
  USING (
    (NOT is_private AND box_id IN (SELECT public.get_user_box_ids()))
    OR
    (is_private AND id IN (SELECT public.get_user_channel_ids()))
  );

-- Fix channel_members SELECT policy
DROP POLICY IF EXISTS "Channel members can view memberships" ON public.channel_members;
CREATE POLICY "Channel members can view memberships"
  ON public.channel_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    channel_id IN (SELECT public.get_user_channel_ids())
  );

-- Also fix boxes SELECT — it may also hit the same org_members recursion
DROP POLICY IF EXISTS "Org members can view boxes" ON public.boxes;
CREATE POLICY "Org members can view boxes"
  ON public.boxes FOR SELECT
  USING (
    org_id IN (SELECT public.get_user_org_ids())
  );

-- Fix boxes INSERT (uses same pattern)
DROP POLICY IF EXISTS "Org members can create boxes" ON public.boxes;
CREATE POLICY "Org members can create boxes"
  ON public.boxes FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.get_user_org_ids())
  );

-- Fix box_members SELECT
DROP POLICY IF EXISTS "Box members can view memberships" ON public.box_members;
CREATE POLICY "Box members can view memberships"
  ON public.box_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    box_id IN (SELECT public.get_user_box_ids())
  );

-- Fix messages SELECT — uses channel_members which had recursion
DROP POLICY IF EXISTS "Channel members can view messages" ON public.messages;
CREATE POLICY "Channel members can view messages"
  ON public.messages FOR SELECT
  USING (
    channel_id IN (SELECT public.get_user_channel_ids())
    OR
    conversation_id IN (SELECT public.get_user_conversation_ids())
  );
