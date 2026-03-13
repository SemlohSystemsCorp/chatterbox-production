-- ─── Add billing columns to boxes ────────────────────────────────────────────

ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS plan                     text        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS max_seats                integer     NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS stripe_customer_id       text        UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   text        UNIQUE,
  ADD COLUMN IF NOT EXISTS entity_type              text,
  ADD COLUMN IF NOT EXISTS call_minutes_used        integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS call_minutes_reset_at    timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  ADD COLUMN IF NOT EXISTS storage_used_bytes       bigint      NOT NULL DEFAULT 0;

-- ─── RPC helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_call_minutes_for_box(
  box_id uuid,
  minutes_to_add integer
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.boxes
    SET call_minutes_used = call_minutes_used + minutes_to_add
  WHERE id = box_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_storage_bytes_for_box(
  box_id uuid,
  bytes_to_add bigint
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.boxes
    SET storage_used_bytes = storage_used_bytes + bytes_to_add
  WHERE id = box_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_storage_bytes_for_box(
  box_id uuid,
  bytes_to_remove bigint
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.boxes
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - bytes_to_remove)
  WHERE id = box_id;
$$;

CREATE OR REPLACE FUNCTION public.reset_call_minutes_for_box_customer(
  customer_id text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.boxes
    SET
      call_minutes_used     = 0,
      call_minutes_reset_at = now() + interval '1 month'
  WHERE stripe_customer_id = customer_id;
$$;
