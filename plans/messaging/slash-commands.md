# Slash Commands

## Overview
Allow users to type `/command` in the message input to trigger actions like setting status, creating polls, posting GIFs, or running custom integrations.

## User Stories
- As a user, I want to type `/giphy cats` to quickly post a GIF.
- As a user, I want to type `/status In a meeting` to set my status without opening settings.
- As a user, I want to type `/poll "Lunch?" "Pizza" "Sushi" "Tacos"` to create a quick poll.
- As a user, I want autocomplete when I type `/` to see available commands.

## Built-in Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/status [emoji] [text]` | Set your status | `/status :coffee: Taking a break` |
| `/clear-status` | Clear your status | `/clear-status` |
| `/mute [duration]` | Mute notifications | `/mute 1h` |
| `/remind [time] [text]` | Set a reminder | `/remind 3pm Review PR` |
| `/poll [question] [options...]` | Create a poll | `/poll "Lunch?" "Pizza" "Sushi"` |
| `/giphy [query]` | Search and post a GIF | `/giphy excited` |
| `/shrug [text]` | Append ¯\_(ツ)_/¯ | `/shrug works for me` |
| `/tableflip` | Post (╯°□°)╯︵ ┻━┻ | `/tableflip` |
| `/topic [text]` | Set channel topic | `/topic Sprint 42 planning` |
| `/invite @user` | Invite user to channel | `/invite @alice` |
| `/leave` | Leave current channel | `/leave` |
| `/dm @user [text]` | Send a DM | `/dm @bob Hey!` |
| `/call` | Start a call in channel | `/call` |

## Architecture

### Command Registry
```typescript
// src/lib/slash-commands/registry.ts
interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  args?: ArgDefinition[];
  execute: (ctx: CommandContext) => Promise<CommandResult>;
}

interface CommandContext {
  userId: string;
  channelId?: string;
  conversationId?: string;
  boxId: string;
  args: string;
  rawInput: string;
}

type CommandResult =
  | { type: 'message'; content: string }      // Post a message
  | { type: 'ephemeral'; content: string }     // Show only to user
  | { type: 'action'; action: () => void }     // Run a side effect
  | { type: 'modal'; component: ReactNode };   // Open a modal

const commands = new Map<string, SlashCommand>();
export function registerCommand(cmd: SlashCommand) { commands.set(cmd.name, cmd); }
export function getCommand(name: string) { return commands.get(name); }
export function getAllCommands() { return Array.from(commands.values()); }
```

### Command Parsing
```typescript
// src/lib/slash-commands/parser.ts
export function parseCommand(input: string): { name: string; args: string } | null {
  const match = input.match(/^\/(\w+)\s*(.*)/s);
  if (!match) return null;
  return { name: match[1], args: match[2].trim() };
}
```

### Execution Flow
1. User types `/` in message input — autocomplete dropdown appears
2. User selects or finishes typing command + args, presses Enter
3. Client parses command with `parseCommand()`
4. Looks up handler in registry
5. Executes handler — some run client-side (status), some call server actions (remind), some post messages (giphy)
6. Result displayed based on type (post message, show ephemeral, open modal)

### Autocomplete
- Triggered when input starts with `/`
- Filters commands by prefix as user types
- Shows command name, description, and usage
- Arrow keys to navigate, Enter/Tab to select
- Esc to dismiss

## UI Components

### Command Autocomplete Dropdown
- Positioned above the message input
- Shows matching commands with name, description, usage hint
- Highlights the currently selected option
- Max 8 visible items with scroll

### Ephemeral Message
- Styled differently from normal messages (lighter background, italic)
- "Only visible to you" label
- Auto-dismiss after 10 seconds or on click

## File Changes
- `src/lib/slash-commands/registry.ts` — command registry
- `src/lib/slash-commands/parser.ts` — input parser
- `src/lib/slash-commands/commands/` — individual command handlers (one file each)
- `src/components/command-autocomplete.tsx` — autocomplete dropdown
- `src/components/channel-chat.tsx` — intercept `/` input, run commands
- `src/components/dm-chat.tsx` — same
- `src/components/ephemeral-message.tsx` — ephemeral display

## Estimated Effort
- **Lines of code:** ~1,200–1,800
- **Complexity:** Medium
- **Dependencies:** GIPHY API key for `/giphy` command

## Edge Cases
- Unknown command — show ephemeral "Unknown command /foo. Type / to see available commands."
- Command fails — show ephemeral error message
- Permissions — `/topic` and `/invite` require channel admin rights
- Rate limiting — `/giphy` should be rate-limited to prevent spam
- Custom commands (v2) — allow workspace admins to define custom slash commands via webhooks
