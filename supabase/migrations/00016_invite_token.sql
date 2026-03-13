-- Add unique token to org_invites for direct invite links (/invite/{token})
ALTER TABLE public.org_invites
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON public.org_invites(token);
