-- Fix RLS policies broken by the org removal in 00020.
--
-- Problems this migration fixes:
--
--  1. boxes INSERT...RETURNING raises "violates row-level security policy"
--     because the SELECT policy only allows rows visible via get_user_box_ids(),
--     but the user isn't in box_members yet at INSERT time.
--     Fix: also allow the box creator to see rows they own.
--
--  2. box_members SELECT policy still joins through org_members (removed).
--     Fix: use get_user_box_ids() + own rows.
--
--  3. box_members INSERT policy still requires org membership (removed).
--     Fix: allow a user to add themselves to any box.
--
--  4. channels INSERT/UPDATE policies still require org membership (removed).
--     Fix: gate on box membership via get_user_box_ids().

-- ── 1. boxes SELECT — also allow the creator ─────────────────────────────────
DROP POLICY IF EXISTS "Users can view their boxes" ON public.boxes;

CREATE POLICY "Users can view their boxes"
  ON public.boxes FOR SELECT
  USING (
    id IN (SELECT public.get_user_box_ids())
    OR created_by = auth.uid()
  );

-- ── 2. box_members SELECT — drop old org-based policy ────────────────────────
DROP POLICY IF EXISTS "Box members can view memberships" ON public.box_members;

CREATE POLICY "Users can view their box memberships"
  ON public.box_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR box_id IN (SELECT public.get_user_box_ids())
  );

-- ── 3. box_members INSERT — replace org-based policy ─────────────────────────
DROP POLICY IF EXISTS "Org members can add box members"   ON public.box_members;
DROP POLICY IF EXISTS "Users can join boxes"              ON public.box_members;

-- Users may only insert a row where they are the subject (join themselves).
-- Admins adding other members goes through the admin client and bypasses RLS.
CREATE POLICY "Users can join boxes"
  ON public.box_members FOR INSERT
  WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- ── 4. channels INSERT — replace org-based policy ────────────────────────────
DROP POLICY IF EXISTS "Org members can create channels" ON public.channels;

CREATE POLICY "Box members can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (box_id IN (SELECT public.get_user_box_ids()));

-- ── 5. channels UPDATE — replace org-based policy ────────────────────────────
DROP POLICY IF EXISTS "Org members can update channels" ON public.channels;

CREATE POLICY "Box members can update channels"
  ON public.channels FOR UPDATE
  USING (box_id IN (SELECT public.get_user_box_ids()));
