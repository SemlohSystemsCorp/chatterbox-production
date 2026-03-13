# Feature: Voice & Video Calls

## Overview
Audio and video calling powered by Daily.co. Supports 1:1 calls, group calls in channels, and screen sharing.

## User Stories
- As a member, I can start an audio call in a channel
- As a member, I can start a video call in a channel
- As a member, I can join an ongoing call in a channel
- As a member, I can share my screen during a call
- As a member, I can mute/unmute audio
- As a member, I can enable/disable video
- As a member, I can start a 1:1 call with another user (DMs)
- As a member, I see who is currently in a call

## Technical Details

### Database Tables
```sql
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

CREATE TABLE public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ
);
```

### API Routes
- `POST /api/calls/create` — Create Daily.co room and call record
- `POST /api/calls/join` — Get meeting token for a call
- `POST /api/calls/end` — End a call, mark as inactive

### Components
- `CallBar` — persistent bar at top when in a call (controls, participants)
- `CallModal` — full call UI with video tiles
- `CallButton` — channel header button to start/join call
- `ScreenShareView` — screen share display
- `ParticipantTile` — individual video/audio participant

### Daily.co Integration
- Create rooms via Daily.co REST API (server-side)
- Generate meeting tokens with expiry
- Use `@daily-co/daily-react` hooks for call UI
- Rooms auto-expire after call ends
