-- Fix: "new row violates row-level security policy for table orgs"
--
-- The SELECT policy only checks org_members, but when INSERT ... RETURNING
-- runs, the user isn't a member yet. Allow org owners to see their own org too.

DROP POLICY IF EXISTS "Org members can view their org" ON public.orgs;

CREATE POLICY "Org members can view their org"
  ON public.orgs FOR SELECT
  USING (
    id IN (SELECT public.get_user_org_ids())
    OR owner_id = auth.uid()
  );
