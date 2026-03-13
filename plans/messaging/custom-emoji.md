# Custom Emoji

## Overview
Allow workspace admins to upload custom emoji that all members can use in messages and reactions.

## User Stories
- As a workspace admin, I want to upload custom emoji (like team logos or inside jokes).
- As a user, I want to use custom emoji in messages and reactions just like standard emoji.
- As a user, I want to search for custom emoji by name in the emoji picker.

## Database Changes

### New table: `custom_emoji`
```sql
CREATE TABLE custom_emoji (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "partyparrot"
  image_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (box_id, name)
);

ALTER TABLE custom_emoji ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Box members can see custom emoji" ON custom_emoji FOR SELECT
  USING (box_id IN (SELECT get_user_box_ids()));

CREATE POLICY "Admins can manage custom emoji" ON custom_emoji FOR ALL
  USING (box_id IN (SELECT get_user_admin_org_ids())); -- or box admin check
```

### Supabase Storage
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-emoji', 'custom-emoji', true);
-- Max file size: 256KB, image types only
```

## Architecture

### Upload Flow
1. Admin goes to workspace settings → Custom Emoji
2. Uploads an image (PNG, GIF, max 256KB, max 128x128px)
3. Enters a name (alphanumeric + underscores, no spaces)
4. Image uploaded to Storage bucket `custom-emoji/{box_id}/{name}.png`
5. Record inserted into `custom_emoji` table

### Usage in Messages
- Custom emoji syntax: `:emoji_name:`
- Message renderer checks for custom emoji names and replaces with `<img>` tags
- In reactions: store as `:custom:emoji_name:` to distinguish from Unicode emoji

### Emoji Picker Integration
- Custom emoji section at the top of emoji picker
- Searchable by name
- Shows emoji image + name
- "Add Custom Emoji" button for admins

## UI Components

### Custom Emoji Manager (workspace settings)
- Grid of existing custom emoji with name, image, uploaded by, delete button
- Upload form: image drop zone + name input
- Validation: name format, file size, image dimensions

### Emoji Picker Enhancement
- "Custom" tab/section showing workspace emoji
- Search includes custom emoji names
- Recent custom emoji in "Recently Used" section

## File Changes
- `supabase/migrations/00027_custom_emoji.sql` — table + storage + RLS
- `src/components/custom-emoji-manager.tsx` — admin management UI
- `src/components/emoji-picker.tsx` — add custom emoji section (or create if doesn't exist)
- `src/lib/supabase/custom-emoji.ts` — CRUD helpers
- `src/lib/message-renderer.ts` — parse and render `:custom_name:` syntax
- `src/app/box/[slug]/settings/page.tsx` — add emoji management tab

## Estimated Effort
- **Lines of code:** ~700–1,000
- **Complexity:** Medium
- **Dependencies:** None

## Edge Cases
- Name collision with Unicode emoji — prefix custom emoji differently in storage
- Animated GIF emoji — support GIF format, reasonable file size limit
- Emoji deleted while in use — show fallback `:deleted_emoji:` text
- Workspace reaches emoji limit — cap at 200 custom emoji for free, unlimited for pro
- Image resizing — auto-resize to 64x64 on upload for consistency
