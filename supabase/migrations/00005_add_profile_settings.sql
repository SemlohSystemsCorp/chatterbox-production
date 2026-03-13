-- Add user settings columns to the profiles table so all preferences
-- are stored in one place alongside the profile data.

-- Notification settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email_mentions BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email_dms BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email_digest BOOLEAN DEFAULT false;

-- Appearance settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS appearance_density TEXT DEFAULT 'comfortable';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS appearance_font_size TEXT DEFAULT 'medium';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS appearance_theme TEXT DEFAULT 'light';
