-- Pricing model updates
-- - Remove enterprise plan (free + pro only)
-- - Update free tier: 20 seats default (was 5)
-- - Reduce max orgs per user from 3 to 2
-- - Add call minute and storage tracking columns

-- ============================================
-- PLAN: remove enterprise, keep free + pro
-- ============================================
ALTER TABLE public.orgs DROP CONSTRAINT IF EXISTS orgs_plan_check;
ALTER TABLE public.orgs ADD CONSTRAINT orgs_plan_check CHECK (plan IN ('free', 'pro'));

-- Downgrade any existing enterprise orgs to pro
UPDATE public.orgs SET plan = 'pro' WHERE plan = 'enterprise';

-- ============================================
-- DEFAULT SEATS: 5 → 20 for free tier
-- ============================================
ALTER TABLE public.orgs ALTER COLUMN max_seats SET DEFAULT 20;

-- Update existing free orgs that still have the old default of 5
UPDATE public.orgs SET max_seats = 20 WHERE plan = 'free' AND max_seats = 5;

-- ============================================
-- USAGE TRACKING COLUMNS
-- ============================================
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS call_minutes_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS call_minutes_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0;

-- ============================================
-- MAX ORGS PER USER: 3 → 2
-- ============================================
CREATE OR REPLACE FUNCTION public.check_max_orgs()
RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.org_members WHERE user_id = NEW.user_id) >= 2 THEN
    RAISE EXCEPTION 'User can belong to a maximum of 2 organizations';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
