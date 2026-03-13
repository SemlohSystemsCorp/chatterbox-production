# Feature: Search

## Overview
Full-text search across messages, channels, and members within a box.

## User Stories
- As a member, I can search messages across all my channels
- As a member, I can filter search by channel, user, or date range
- As a member, I can search for channels by name
- As a member, I can search for members by name

## Technical Details

### Postgres Full-Text Search
- Use `tsvector` column on messages for full-text indexing
- `to_tsvector('english', content)` on message insert/update
- `plainto_tsquery` for user search input
- GIN index on tsvector column for performance

```sql
ALTER TABLE public.messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX idx_messages_search ON public.messages USING GIN(search_vector);
```

### Components
- `SearchModal` — command-K modal with instant search
- `SearchResults` — grouped results (messages, channels, members)
- `SearchFilters` — channel, user, date range filters
