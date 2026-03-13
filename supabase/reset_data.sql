-- Reset all data (preserves tables, policies, functions, triggers, etc.)
-- Run this in the Supabase SQL Editor to wipe all rows.
-- Uses DELETE in FK-safe order (children first).

-- Public tables
DELETE FROM public.call_participants;
DELETE FROM public.calls;
DELETE FROM public.reactions;
DELETE FROM public.attachments;
DELETE FROM public.messages;
DELETE FROM public.channel_members;
DELETE FROM public.channels;
DELETE FROM public.conversation_members;
DELETE FROM public.conversations;
DELETE FROM public.box_members;
DELETE FROM public.boxes;
DELETE FROM public.org_invites;
DELETE FROM public.org_members;
DELETE FROM public.orgs;
DELETE FROM public.verification_codes;
DELETE FROM public.profiles;

-- Auth tables (must clean all of these, not just auth.users)
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
