-- Add slug column to conversations for clean URLs (6-digit numeric codes).

-- Helper function to generate a unique 6-digit conversation slug
CREATE OR REPLACE FUNCTION public.generate_conversation_slug()
RETURNS TRIGGER AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    LOOP
      new_slug := lpad(floor(random() * 1000000)::text, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.conversations WHERE slug = new_slug) INTO slug_exists;
      EXIT WHEN NOT slug_exists;
    END LOOP;
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add slug column
ALTER TABLE public.conversations ADD COLUMN slug TEXT UNIQUE;

-- Backfill existing conversations with unique 6-digit slugs
DO $$
DECLARE
  conv RECORD;
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  FOR conv IN SELECT id FROM public.conversations WHERE slug IS NULL LOOP
    LOOP
      new_slug := lpad(floor(random() * 1000000)::text, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.conversations WHERE slug = new_slug) INTO slug_exists;
      EXIT WHEN NOT slug_exists;
    END LOOP;
    UPDATE public.conversations SET slug = new_slug WHERE id = conv.id;
  END LOOP;
END $$;

-- Now make it NOT NULL
ALTER TABLE public.conversations ALTER COLUMN slug SET NOT NULL;

-- Auto-generate slug on insert
CREATE TRIGGER set_conversation_slug
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.generate_conversation_slug();
