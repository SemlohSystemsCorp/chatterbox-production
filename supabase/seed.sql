-- =============================================================================
-- Chatterbox Test Seed Data
-- Run via: supabase db reset (applies migrations then this file)
-- Or manually: paste into Supabase SQL Editor
--
-- Test accounts (password for all: Test1234!)
--   alice@test.com  — owner of "Acme Inc", admin of "Beta Org"
--   bob@test.com    — admin of "Acme Inc"
--   charlie@test.com — member of "Acme Inc"
--   newuser@test.com — no org, no username (for onboarding tests)
-- =============================================================================

-- Fixed UUIDs for deterministic test references
-- Users
DO $$
DECLARE
  alice_id   UUID := '00000000-0000-0000-0000-000000000001';
  bob_id     UUID := '00000000-0000-0000-0000-000000000002';
  charlie_id UUID := '00000000-0000-0000-0000-000000000003';
  newuser_id UUID := '00000000-0000-0000-0000-000000000004';

  -- Orgs
  acme_id UUID := '10000000-0000-0000-0000-000000000001';
  beta_id UUID := '10000000-0000-0000-0000-000000000002';

  -- Boxes
  main_box_id UUID := '20000000-0000-0000-0000-000000000001';
  side_box_id UUID := '20000000-0000-0000-0000-000000000002';

  -- Channels
  general_id  UUID := '30000000-0000-0000-0000-000000000001';
  random_id   UUID := '30000000-0000-0000-0000-000000000002';
  eng_id      UUID := '30000000-0000-0000-0000-000000000003';
  private_id  UUID := '30000000-0000-0000-0000-000000000004';

BEGIN

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) VALUES
  (
    alice_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'alice@test.com', crypt('Test1234!', gen_salt('bf')), now(),
    '{"display_name":"Alice Test","first_name":"Alice","last_name":"Test"}'::jsonb,
    now(), now()
  ),
  (
    bob_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'bob@test.com', crypt('Test1234!', gen_salt('bf')), now(),
    '{"display_name":"Bob Test","first_name":"Bob","last_name":"Test"}'::jsonb,
    now(), now()
  ),
  (
    charlie_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'charlie@test.com', crypt('Test1234!', gen_salt('bf')), now(),
    '{"display_name":"Charlie Test","first_name":"Charlie","last_name":"Test"}'::jsonb,
    now(), now()
  ),
  (
    newuser_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'newuser@test.com', crypt('Test1234!', gen_salt('bf')), now(),
    '{"display_name":"New User","first_name":"New","last_name":"User"}'::jsonb,
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Auth identities (needed for signInWithPassword to work)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
) VALUES
  (alice_id,   alice_id,   'alice@test.com',   'email', jsonb_build_object('sub', alice_id::text,   'email', 'alice@test.com'),   now(), now(), now()),
  (bob_id,     bob_id,     'bob@test.com',     'email', jsonb_build_object('sub', bob_id::text,     'email', 'bob@test.com'),     now(), now(), now()),
  (charlie_id, charlie_id, 'charlie@test.com', 'email', jsonb_build_object('sub', charlie_id::text, 'email', 'charlie@test.com'), now(), now(), now()),
  (newuser_id, newuser_id, 'newuser@test.com', 'email', jsonb_build_object('sub', newuser_id::text, 'email', 'newuser@test.com'), now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Profiles (trigger auto-creates these, but we set usernames explicitly)
-- ---------------------------------------------------------------------------
UPDATE public.profiles SET username = 'alice',   display_name = 'Alice Test'   WHERE id = alice_id;
UPDATE public.profiles SET username = 'bob',     display_name = 'Bob Test'     WHERE id = bob_id;
UPDATE public.profiles SET username = 'charlie', display_name = 'Charlie Test' WHERE id = charlie_id;
-- newuser intentionally has no username to simulate incomplete onboarding

-- ---------------------------------------------------------------------------
-- Orgs
-- ---------------------------------------------------------------------------
INSERT INTO public.orgs (id, name, slug, owner_id, plan, entity_type) VALUES
  (acme_id, 'Acme Inc',  'acme-inc',  alice_id, 'free', 'Company'),
  (beta_id, 'Beta Org',  'beta-org',  alice_id, 'pro',  'Startup')
ON CONFLICT (id) DO NOTHING;

-- Org members
INSERT INTO public.org_members (org_id, user_id, role) VALUES
  (acme_id, alice_id,   'owner'),
  (acme_id, bob_id,     'admin'),
  (acme_id, charlie_id, 'member'),
  (beta_id, alice_id,   'owner'),
  (beta_id, bob_id,     'member')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Boxes (workspaces)
-- ---------------------------------------------------------------------------
INSERT INTO public.boxes (id, org_id, name, slug, description, created_by) VALUES
  (main_box_id, acme_id, 'Main',    'main',    'Primary workspace for Acme Inc', alice_id),
  (side_box_id, acme_id, 'Side',    'side',    'Side projects',                  alice_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.box_members (box_id, user_id) VALUES
  (main_box_id, alice_id),
  (main_box_id, bob_id),
  (main_box_id, charlie_id),
  (side_box_id, alice_id),
  (side_box_id, bob_id)
ON CONFLICT (box_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Channels
-- ---------------------------------------------------------------------------
INSERT INTO public.channels (id, box_id, name, slug, description, is_private, created_by) VALUES
  (general_id, main_box_id, 'general',  'general',  'General discussion',   false, alice_id),
  (random_id,  main_box_id, 'random',   'random',   'Off-topic chat',       false, alice_id),
  (eng_id,     main_box_id, 'eng',      'eng',      'Engineering only',     false, alice_id),
  (private_id, main_box_id, 'vip',      'vip',      'Private VIP channel',  true,  alice_id)
ON CONFLICT (id) DO NOTHING;

-- Channel members
INSERT INTO public.channel_members (channel_id, user_id) VALUES
  (general_id, alice_id),
  (general_id, bob_id),
  (general_id, charlie_id),
  (random_id,  alice_id),
  (random_id,  bob_id),
  (eng_id,     alice_id),
  (eng_id,     bob_id),
  -- private channel: only alice and bob
  (private_id, alice_id),
  (private_id, bob_id)
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sample messages
-- ---------------------------------------------------------------------------
INSERT INTO public.messages (id, channel_id, user_id, content, created_at) VALUES
  (gen_random_uuid(), general_id, alice_id,   'Hey everyone, welcome to Acme!',        now() - interval '2 days'),
  (gen_random_uuid(), general_id, bob_id,     'Thanks Alice! Excited to be here.',     now() - interval '2 days' + interval '1 minute'),
  (gen_random_uuid(), general_id, charlie_id, 'Hello from Charlie!',                   now() - interval '1 day'),
  (gen_random_uuid(), general_id, alice_id,   'Check out the engineering channel too.', now() - interval '1 hour'),
  (gen_random_uuid(), random_id,  bob_id,     'Anyone up for a virtual coffee? ☕',    now() - interval '3 hours'),
  (gen_random_uuid(), random_id,  alice_id,   'Always! 😄',                            now() - interval '2 hours'),
  (gen_random_uuid(), eng_id,     alice_id,   'Deploying v2 today, heads up!',          now() - interval '30 minutes'),
  (gen_random_uuid(), eng_id,     bob_id,     'On it — monitoring dashboards.',         now() - interval '20 minutes'),
  (gen_random_uuid(), private_id, alice_id,   'VIP only content here.',                now() - interval '1 hour')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- A pending org invite (for testing the invite flow)
-- ---------------------------------------------------------------------------
INSERT INTO public.org_invites (org_id, email, role, invited_by, channel_ids) VALUES
  (acme_id, 'invited@test.com', 'member', alice_id, ARRAY[general_id::text, random_id::text])
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- A ready-to-use verification code (for testing verify flow without email)
-- ---------------------------------------------------------------------------
INSERT INTO public.verification_codes (id, email, code, type, expires_at, used) VALUES
  ('vc-test-alice-001', 'alice@test.com',   '111111', 'signup', now() + interval '10 minutes', false),
  ('vc-test-expire-01', 'bob@test.com',     '222222', 'signup', now() - interval '1 minute',   false),
  ('vc-test-used-0001', 'charlie@test.com', '333333', 'signup', now() + interval '10 minutes', true)
ON CONFLICT (id) DO NOTHING;

END $$;
