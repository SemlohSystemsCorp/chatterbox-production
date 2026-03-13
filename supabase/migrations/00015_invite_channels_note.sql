-- Add channel access and personal note to org invites
ALTER TABLE public.org_invites
  ADD COLUMN IF NOT EXISTS channel_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS note TEXT;
