# Feature: User Presence & Status

## Overview
Real-time online/offline status and custom status messages using Supabase Realtime Presence.

## User Stories
- As a member, I see who is online/offline/away
- As a member, I can set a custom status message and emoji
- As a member, I can set myself as away/DND
- As a member, I see presence indicators on avatars

## Technical Details

### Supabase Realtime Presence
- Track user presence per box using Supabase Realtime channels
- Presence states: `online`, `away`, `dnd`, `offline`
- Auto-detect idle (5 min) → set to `away`
- Heartbeat via Presence API

### Status Storage
- Custom status stored in `profiles.status_message`
- Presence state ephemeral (Realtime only)
- Status emoji stored in `profiles.status_emoji`

### Components
- `PresenceIndicator` — green/yellow/red/gray dot on avatars
- `StatusPicker` — set status message + emoji + duration
- `MemberList` — online members sidebar panel
