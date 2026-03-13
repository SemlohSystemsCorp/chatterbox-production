# Typing Indicators

## Overview
Show real-time "X is typing..." indicators when other users are composing messages in a channel or DM.

## User Stories
- As a user, I want to see when someone is typing in a DM so I know to wait for their response.
- As a user, I want to see "Alice and Bob are typing..." in channels.
- As a user, I want the indicator to disappear if they stop typing.

## Technical Approach

### No Database Changes
Typing indicators are ephemeral — no persistence needed. Use Supabase Realtime Presence or Broadcast channels.

### Supabase Realtime Broadcast
```typescript
// Broadcast is ideal: fire-and-forget, no persistence
const channel = supabase.channel(`typing:${channelId}`);

// Send typing event
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, displayName, avatarUrl },
});

// Listen for typing events
channel.on('broadcast', { event: 'typing' }, (payload) => {
  addTypingUser(payload.userId, payload.displayName);
});
```

## Architecture

### Sending Typing Events
1. User starts typing in message input
2. Client sends `typing` broadcast event
3. Debounce: only send one event per 3 seconds while typing continues
4. When user stops typing for 5 seconds, send `stopped_typing` event (or let it timeout)

### Receiving Typing Events
1. Subscribe to `typing:{channelId}` broadcast channel
2. On `typing` event: add user to typing set with timestamp
3. On `stopped_typing` event or after 6-second timeout: remove user from set
4. Display indicator based on current typing set

### Display Logic
- 0 typing: show nothing
- 1 typing: "Alice is typing..."
- 2 typing: "Alice and Bob are typing..."
- 3+ typing: "Alice, Bob, and 2 others are typing..."
- Never show the current user's own typing indicator

### Debouncing Strategy
```typescript
// src/hooks/use-typing-indicator.ts
const SEND_INTERVAL = 3000;  // Don't send more than once per 3s
const EXPIRE_TIME = 6000;    // Remove indicator after 6s of silence

let lastSentAt = 0;

function onInputChange() {
  const now = Date.now();
  if (now - lastSentAt > SEND_INTERVAL) {
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId, displayName } });
    lastSentAt = now;
  }
}
```

## UI Components

### Typing Indicator Bar
- Positioned below the message list, above the input
- Animated dots: ● ● ● (CSS animation)
- Text: "Alice is typing..." with subtle fade-in/out
- Height: ~24px, doesn't push content up (absolute positioned or reserved space)

### Animated Dots
```css
.typing-dots span {
  animation: typing 1.4s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}
```

## File Changes
- `src/hooks/use-typing-indicator.ts` — send/receive typing events
- `src/components/typing-indicator.tsx` — display component
- `src/components/channel-chat.tsx` — integrate hook and display
- `src/components/dm-chat.tsx` — integrate hook and display

## Estimated Effort
- **Lines of code:** ~300–450
- **Complexity:** Low
- **Dependencies:** Supabase Realtime Broadcast (already used)

## Edge Cases
- User closes tab while typing — timeout handles cleanup (6s)
- Multiple channels open — only subscribe to current channel's typing events
- User types, deletes all text — still shows typing briefly (acceptable)
- Slow network — typing events may arrive late; timeout ensures cleanup
- Same user on multiple devices — deduplicate by userId
