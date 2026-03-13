-- Fix: clean up orphaned auth data, re-enable triggers, restore profile trigger.
-- Run this in the Supabase SQL Editor.

-- 1. Re-enable all triggers
SET session_replication_role = 'origin';

-- 2. Clean up orphaned auth tables (the reset script only deleted auth.users
--    but didn't cascade to these internal tables)
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.flow_state;
DELETE FROM auth.saml_relay_states;
DELETE FROM auth.one_time_tokens;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- 3. Re-create the profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
