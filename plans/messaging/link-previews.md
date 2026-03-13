# Link Previews / URL Unfurling

## Overview
Automatically detect URLs in messages and display rich previews with title, description, image, and favicon from the linked page's Open Graph metadata.

## User Stories
- As a user, I want links I share to show a preview card so people know what I'm linking to.
- As a user, I want to dismiss/collapse a link preview if it's noisy.
- As a channel admin, I want to disable link previews for specific channels if needed.

## Database Changes

### New table: `link_previews`
```sql
CREATE TABLE link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  favicon_url TEXT,
  site_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error BOOLEAN NOT NULL DEFAULT false
);

-- Cache: previews are shared across messages
CREATE INDEX idx_link_previews_url ON link_previews (url);

-- Link messages to their previews (many-to-many since a message can have multiple links)
CREATE TABLE message_link_previews (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  link_preview_id UUID NOT NULL REFERENCES link_previews(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (message_id, link_preview_id)
);

ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_link_previews ENABLE ROW LEVEL SECURITY;

-- Readable by anyone (previews are not sensitive)
CREATE POLICY "Anyone can read previews" ON link_previews FOR SELECT USING (true);
```

## Architecture

### URL Detection
```typescript
// Extract URLs from message content
const URL_REGEX = /https?:\/\/[^\s<>\"')\]]+/g;

function extractUrls(content: string): string[] {
  return [...content.matchAll(URL_REGEX)].map(m => m[0]);
}
```

### Fetching Flow
1. Message is created with URL(s)
2. Server Action / Edge Function detects URLs in content
3. For each URL, check `link_previews` cache (skip if fetched < 24h ago)
4. If not cached, fetch the page via API route (server-side to avoid CORS)
5. Parse Open Graph tags: `og:title`, `og:description`, `og:image`, `og:site_name`
6. Fallback to `<title>`, `<meta name="description">`, first `<img>`, favicon
7. Insert into `link_previews` and `message_link_previews`
8. Real-time update pushes preview data to connected clients

### API Route: `POST /api/link-preview`
```typescript
// src/app/api/link-preview/route.ts
export async function POST(req: Request) {
  const { url } = await req.json();

  // Security: validate URL, block private IPs (SSRF prevention)
  if (!isValidPublicUrl(url)) return Response.json({ error: 'Invalid URL' }, { status: 400 });

  const html = await fetch(url, {
    headers: { 'User-Agent': 'Chatterbox-Bot/1.0' },
    signal: AbortSignal.timeout(5000),
  }).then(r => r.text());

  const meta = parseOpenGraph(html, url);
  // Upsert into link_previews table
  return Response.json(meta);
}
```

### SSRF Prevention
```typescript
function isValidPublicUrl(url: string): boolean {
  const parsed = new URL(url);
  // Block private/internal IPs
  const blocked = ['127.0.0.1', 'localhost', '10.', '172.16.', '192.168.', '169.254.', '0.0.0.0'];
  return !blocked.some(b => parsed.hostname.startsWith(b) || parsed.hostname === b);
}
```

## UI Components

### `LinkPreviewCard`
```
┌─────────────────────────────────────┐
│ 🌐 site.com                        │
│ Page Title Here                     │
│ Description text from the page...   │
│ ┌─────────────────────────────────┐ │
│ │         Preview Image           │ │
│ └─────────────────────────────────┘ │
│                              [✕]    │
└─────────────────────────────────────┘
```
- Favicon + site name
- Title (linked)
- Description (truncated to 2 lines)
- Image (if available, max height 200px)
- Dismiss button (✕) to collapse

### Special Embeds
- **YouTube:** embed video player
- **Twitter/X:** embed tweet
- **GitHub:** show repo card with stars/description
- **Images (png/jpg/gif URLs):** show inline image

## File Changes
- `supabase/migrations/00027_link_previews.sql` — tables + RLS
- `src/app/api/link-preview/route.ts` — server-side fetcher with SSRF protection
- `src/lib/open-graph.ts` — HTML parser for OG tags
- `src/components/link-preview-card.tsx` — preview card component
- `src/components/channel-chat.tsx` — render previews below messages
- `src/lib/supabase/link-previews.ts` — CRUD helpers

## Estimated Effort
- **Lines of code:** ~800–1,200
- **Complexity:** Medium
- **Dependencies:** None (server-side fetch, HTML parsing)

## Edge Cases
- Page returns 404/500 — mark as error, don't show preview
- Page is very slow — 5-second timeout, fail gracefully
- Page has no OG tags — fallback to `<title>` and first image
- SSRF — validate URLs are public, block internal IPs
- Rate limiting — don't fetch same URL more than once per 24 hours
- Multiple links in one message — show up to 3 previews, "Show more" for rest
- Preview image is broken — hide image, show text-only card
