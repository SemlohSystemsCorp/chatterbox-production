# Rich Text Editor

## Overview
Replace the plain textarea with a rich text editor supporting bold, italic, strikethrough, code, code blocks, lists, blockquotes, and links with a formatting toolbar.

## User Stories
- As a user, I want to format my messages with bold, italic, and code without remembering markdown syntax.
- As a user, I want a toolbar that lets me apply formatting with a click.
- As a user, I want to paste code and have it automatically formatted in a code block.
- As a user, I want to switch between rich text and markdown mode.

## Technical Approach

### Library: Tiptap (built on ProseMirror)
- Lightweight, extensible, React-friendly
- Built-in extensions for all needed formatting
- Supports markdown input rules (type `**bold**` and it renders)
- Good mobile support
- Package: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`

### Storage Format
- Store as **markdown** in the database (same `content` column on `messages`)
- Render markdown on display using existing rendering
- Tiptap converts between rich text DOM and markdown for storage
- No schema changes needed

## Architecture

### Editor Stack
```
Tiptap Editor (ProseMirror)
  ├── StarterKit (bold, italic, strike, code, codeBlock, heading, list, blockquote)
  ├── Link extension (auto-detect URLs, click to open)
  ├── Mention extension (@user autocomplete — replaces current implementation)
  ├── Placeholder extension ("Type a message...")
  └── Markdown extension (import/export markdown)
```

### Formatting Toolbar
- Floating toolbar appears on text selection (like Notion)
- Fixed toolbar below editor (toggleable)
- Buttons: **B** | *I* | ~~S~~ | `Code` | Link | Bulleted List | Numbered List | Blockquote | Code Block
- Keyboard shortcuts: Cmd+B, Cmd+I, Cmd+Shift+X (strike), Cmd+E (code), Cmd+K (link)

### Markdown Mode Toggle
- Button in toolbar to switch to raw markdown editing
- Stores user preference in localStorage
- Raw mode is a plain textarea with monospace font

## UI Components

### `MessageEditor` (replaces current textarea)
```tsx
// src/components/message-editor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function MessageEditor({ onSubmit, placeholder }) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Mention, Placeholder],
    onKeyDown: ({ event }) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        onSubmit(editor.storage.markdown.getMarkdown());
      }
    },
  });

  return (
    <div className="message-editor">
      <FormatToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

### `FormatToolbar`
- Row of icon buttons with active state highlighting
- Tooltip with keyboard shortcut on hover
- Responsive: collapses to overflow menu on small screens

## File Changes
- `package.json` — add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-mention`, `@tiptap/extension-placeholder`
- `src/components/message-editor.tsx` — new Tiptap-based editor
- `src/components/format-toolbar.tsx` — formatting toolbar
- `src/components/channel-chat.tsx` — swap textarea for MessageEditor
- `src/components/dm-chat.tsx` — swap textarea for MessageEditor
- `src/components/thread-panel.tsx` — swap textarea for MessageEditor

## Estimated Effort
- **Lines of code:** ~1,000–1,500
- **Complexity:** Medium-High
- **Dependencies:** Tiptap packages (~150KB gzipped)

## Edge Cases
- Pasting from external apps (Google Docs, Word) — Tiptap handles HTML paste, convert to markdown
- Very long code blocks — horizontal scroll, syntax highlighting (v2)
- Mobile: toolbar must be touch-friendly, no hover states
- Existing messages in plain text — render as-is, no migration needed
- @mention autocomplete must work inside the rich editor (Tiptap Mention extension handles this)
