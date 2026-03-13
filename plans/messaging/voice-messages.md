# Voice Messages

## Overview
Allow users to record and send short audio messages directly in chat, providing a faster alternative to typing for quick updates.

## User Stories
- As a user, I want to hold a button to record a voice message and release to send.
- As a user, I want to preview my recording before sending.
- As a user, I want to see a waveform visualization when playing a voice message.
- As a user, I want voice messages to count against my storage quota.

## Technical Approach

### Recording
- Use `MediaRecorder` API (built into all modern browsers)
- Record as WebM/Opus (best compression) with MP3 fallback for Safari
- Max duration: 5 minutes
- Show recording timer and waveform visualization during recording

### Storage
- Upload to Supabase Storage `voice-messages` bucket
- Store metadata in `attachments` table with `type: 'voice'`
- Compress before upload using Web Audio API
- File naming: `{box_id}/{channel_id}/{message_id}.webm`

### Playback
- Custom audio player with waveform visualization
- Use Web Audio API `AnalyserNode` for waveform data
- Playback speed control (1x, 1.5x, 2x)
- Global playback: only one voice message plays at a time

## Database Changes

No new tables needed. Uses existing `attachments` table with:
```sql
-- Add voice-specific fields to attachments
ALTER TABLE attachments ADD COLUMN duration_seconds NUMERIC;
ALTER TABLE attachments ADD COLUMN waveform_data JSONB; -- pre-computed waveform peaks
```

### Supabase Storage
```sql
-- New bucket for voice messages
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true);

-- RLS: members of the box can read, only message author can write
CREATE POLICY "Box members can read voice messages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages' AND ...);

CREATE POLICY "Users can upload own voice messages"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-messages' AND auth.uid() = owner);
```

## Architecture

### Recording Flow
1. User clicks/holds microphone button in message composer
2. Browser requests microphone permission (if not already granted)
3. `MediaRecorder` starts capturing audio
4. Live waveform visualization shown during recording
5. User releases button or clicks stop
6. Preview plays back with option to send or discard
7. On send: upload audio to Storage, create message with attachment

### Pre-computed Waveform
- After recording, use `AudioContext.decodeAudioData()` to extract peaks
- Store as array of ~100 normalized amplitude values in `waveform_data`
- Renders instantly on load without re-analyzing audio

## UI Components

### `VoiceRecordButton`
- Microphone icon in message composer
- States: idle, recording (pulsing red), uploading
- Hold-to-record or click-to-toggle modes
- Recording timer display
- Cancel by dragging left (mobile pattern)

### `VoiceRecordPreview`
- Appears above message input after recording
- Waveform preview + play button
- Duration display
- Send / Discard buttons

### `VoiceMessagePlayer` (in message list)
- Play/pause button
- Waveform visualization (bars animate as audio plays)
- Duration / current time
- Playback speed button (1x → 1.5x → 2x)
- Download button

## File Changes
- `supabase/migrations/00027_voice_messages.sql` — alter attachments, storage bucket
- `src/components/voice-record-button.tsx` — recording UI
- `src/components/voice-record-preview.tsx` — preview before send
- `src/components/voice-message-player.tsx` — playback UI with waveform
- `src/hooks/use-audio-recorder.ts` — MediaRecorder hook
- `src/hooks/use-audio-waveform.ts` — waveform analysis hook
- `src/lib/audio-utils.ts` — compression, waveform extraction
- `src/components/media-preview.tsx` — handle voice type attachments

## Estimated Effort
- **Lines of code:** ~1,200–1,600
- **Complexity:** Medium-High
- **Dependencies:** Browser MediaRecorder API, Web Audio API

## Edge Cases
- Browser doesn't support MediaRecorder — show "Voice messages not supported" tooltip
- Microphone permission denied — show instructions to enable
- Network failure during upload — retry with exponential backoff, keep local copy
- Very long messages (5+ min) — enforce max duration with countdown
- Mobile: hold-to-record must not conflict with scroll gestures
- Storage quota exceeded — show error before recording starts
