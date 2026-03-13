-- Remove org layer — boxes now belong directly to users (via box_members)

-- 1. Make org_id nullable so existing boxes don't break immediately
ALTER TABLE public.boxes ALTER COLUMN org_id DROP NOT NULL;

-- 2. Drop the (org_id, slug) unique constraint, add a plain slug unique constraint
ALTER TABLE public.boxes DROP CONSTRAINT IF EXISTS boxes_org_id_slug_key;
ALTER TABLE public.boxes ADD CONSTRAINT boxes_slug_key UNIQUE (slug);

-- 3. Update get_user_box_ids() to use box_members instead of org membership
CREATE OR REPLACE FUNCTION public.get_user_box_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT box_id
  FROM public.box_members
  WHERE user_id = auth.uid();
$$;

-- 4. Drop old org-based boxes policies
DROP POLICY IF EXISTS "Box members can view boxes" ON public.boxes;
DROP POLICY IF EXISTS "Org members can view boxes" ON public.boxes;
DROP POLICY IF EXISTS "Org members can create boxes" ON public.boxes;
DROP POLICY IF EXISTS "Org owners/admins can update boxes" ON public.boxes;

-- 5. Create new box_members-based policies
CREATE POLICY "Users can view their boxes"
  ON public.boxes FOR SELECT
  USING (id IN (SELECT public.get_user_box_ids()));

CREATE POLICY "Authenticated users can create boxes"
  ON public.boxes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Box owners can update their boxes"
  ON public.boxes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Box owners can delete their boxes"
  ON public.boxes FOR DELETE
  USING (created_by = auth.uid());
