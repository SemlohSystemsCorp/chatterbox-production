-- Fix private channel creation.
--
-- Two issues:
-- 1. The channels INSERT policy queries `boxes` directly through RLS instead
--    of using the SECURITY DEFINER helper `get_user_box_ids()`, which can
--    cause RLS evaluation failures.
-- 2. After inserting a private channel, the chained `.select()` fails because
--    the creator isn't in `channel_members` yet — the SELECT policy for
--    private channels only checks membership. We add `created_by = auth.uid()`
--    as an additional condition so creators can read their own private channel
--    immediately.

-- 1. Fix INSERT policy to use the SECURITY DEFINER helper
DROP POLICY IF EXISTS "Org members can create channels" ON public.channels;
CREATE POLICY "Org members can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    box_id IN (SELECT public.get_user_box_ids())
    AND created_by = auth.uid()
  );

-- 2. Fix SELECT policy to let private channel creators see their own channel
--    before they are added to channel_members
DROP POLICY IF EXISTS "Members can view public channels in their boxes" ON public.channels;
CREATE POLICY "Members can view channels in their boxes"
  ON public.channels FOR SELECT
  USING (
    (NOT is_private AND box_id IN (SELECT public.get_user_box_ids()))
    OR
    (is_private AND (
      id IN (SELECT public.get_user_channel_ids())
      OR created_by = auth.uid()
    ))
  );

-- 3. Fix UPDATE policy to also use the helper
DROP POLICY IF EXISTS "Org members can update channels" ON public.channels;
CREATE POLICY "Org members can update channels"
  ON public.channels FOR UPDATE
  USING (
    box_id IN (SELECT public.get_user_box_ids())
  );

-- 4. Tighten channel_members INSERT for private channels.
--    Public channels: any authenticated box member can join.
--    Private channels: only the channel creator or an existing member can add people.
DROP POLICY IF EXISTS "Authenticated users can join channels" ON public.channel_members;
CREATE POLICY "Users can join or be added to channels"
  ON public.channel_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Public channel: anyone in the box can join
      channel_id IN (
        SELECT id FROM public.channels
        WHERE NOT is_private AND box_id IN (SELECT public.get_user_box_ids())
      )
      OR
      -- Private channel: the inserting user must already be a member or be the creator
      channel_id IN (
        SELECT id FROM public.channels
        WHERE is_private AND (
          id IN (SELECT public.get_user_channel_ids())
          OR created_by = auth.uid()
        )
      )
    )
  );
