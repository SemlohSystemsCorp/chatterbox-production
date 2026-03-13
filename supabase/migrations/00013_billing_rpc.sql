-- RPC helpers for atomic usage counter increments/decrements.
-- Called by src/lib/billing.ts via the admin client.

CREATE OR REPLACE FUNCTION public.increment_call_minutes(org_id uuid, minutes_to_add int)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.orgs
  SET call_minutes_used = call_minutes_used + minutes_to_add
  WHERE id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_storage_bytes(org_id uuid, bytes_to_add bigint)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.orgs
  SET storage_used_bytes = storage_used_bytes + bytes_to_add
  WHERE id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_storage_bytes(org_id uuid, bytes_to_remove bigint)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.orgs
  SET storage_used_bytes = GREATEST(0, storage_used_bytes - bytes_to_remove)
  WHERE id = org_id;
$$;

-- Reset call minutes and advance the reset window (called by the webhook on invoice.payment_succeeded)
CREATE OR REPLACE FUNCTION public.reset_call_minutes_for_customer(customer_id text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  next_reset timestamptz;
BEGIN
  next_reset := date_trunc('month', now()) + interval '1 month';
  UPDATE public.orgs
  SET
    call_minutes_used = 0,
    call_minutes_reset_at = next_reset
  WHERE stripe_customer_id = customer_id;
END;
$$;
