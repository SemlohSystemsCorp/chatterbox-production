-- Chatterbox Initial Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  status_message TEXT,
  status_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_seats INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their org"
  ON public.orgs FOR SELECT
  USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org owners can update their org"
  ON public.orgs FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create orgs"
  ON public.orgs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org members can view memberships"
  ON public.org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org owners/admins can manage members"
  ON public.org_members FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Enforce max 3 orgs per user
CREATE OR REPLACE FUNCTION public.check_max_orgs()
RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.org_members WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'User can belong to a maximum of 3 organizations';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_orgs
  BEFORE INSERT ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.check_max_orgs();

-- ============================================
-- ORG INVITES
-- ============================================
CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invites"
  ON public.org_invites FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- BOXES (WORKSPACES)
-- ============================================
CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.box_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(box_id, user_id)
);

ALTER TABLE public.box_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Box members can view boxes"
  ON public.boxes FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Box members can view memberships"
  ON public.box_members FOR SELECT
  USING (
    box_id IN (
      SELECT b.id FROM public.boxes b
      JOIN public.org_members om ON om.org_id = b.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================
-- CHANNELS
-- ============================================
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(box_id, slug)
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  notifications TEXT DEFAULT 'all' CHECK (notifications IN ('all', 'mentions', 'none')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view public channels in their boxes"
  ON public.channels FOR SELECT
  USING (
    (NOT is_private AND box_id IN (
      SELECT b.id FROM public.boxes b
      JOIN public.org_members om ON om.org_id = b.org_id
      WHERE om.user_id = auth.uid()
    ))
    OR
    (is_private AND id IN (
      SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Channel members can view memberships"
  ON public.channel_members FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE NOT is_private
      AND box_id IN (
        SELECT b.id FROM public.boxes b
        JOIN public.org_members om ON om.org_id = b.org_id
        WHERE om.user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_channel_created ON public.messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id) WHERE thread_id IS NOT NULL;

-- Full-text search
ALTER TABLE public.messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX idx_messages_search ON public.messages USING GIN(search_vector);

CREATE POLICY "Members can view messages in their channels"
  ON public.messages FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE NOT is_private
      AND box_id IN (
        SELECT b.id FROM public.boxes b
        JOIN public.org_members om ON om.org_id = b.org_id
        WHERE om.user_id = auth.uid()
      )
    )
    OR channel_id IN (
      SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- REACTIONS
-- ============================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reactions_message ON public.reactions(message_id);

CREATE POLICY "Members can view reactions"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ATTACHMENTS
-- ============================================
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attachments"
  ON public.attachments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- CONVERSATIONS (DMs)
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Add FK for messages -> conversations
ALTER TABLE public.messages
  ADD CONSTRAINT fk_messages_conversation
  FOREIGN KEY (conversation_id)
  REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE POLICY "Conversation members can view conversations"
  ON public.conversations FOR SELECT
  USING (
    id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Conversation members can view memberships"
  ON public.conversation_members FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- CALLS
-- ============================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  daily_room_name TEXT NOT NULL,
  daily_room_url TEXT NOT NULL,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ
);

ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view calls in their channels"
  ON public.calls FOR SELECT
  USING (
    channel_id IN (
      SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    )
    OR channel_id IN (
      SELECT id FROM public.channels WHERE NOT is_private
      AND box_id IN (
        SELECT b.id FROM public.boxes b
        JOIN public.org_members om ON om.org_id = b.org_id
        WHERE om.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- VERIFICATION CODES
-- ============================================
CREATE TABLE public.verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT DEFAULT 'signup' CHECK (type IN ('signup', 'password_reset')),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verification_codes_email ON public.verification_codes(email, type, used);

-- No RLS — accessed via service role only
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
