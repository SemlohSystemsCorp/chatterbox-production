"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface MemberSuggestion {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionSuggestionsProps {
  /** The full text input value */
  inputValue: string;
  /** The cursor position in the input */
  cursorPos: number;
  /** Channel ID to scope members (for channel chat) */
  channelId?: string;
  /** Conversation ID to scope members (for DM chat) */
  conversationId?: string;
  /** Called when a mention is selected. Returns the new input value and new cursor position. */
  onSelect: (newValue: string, newCursorPos: number) => void;
  /** Called to dismiss the suggestions */
  onDismiss: () => void;
  /** Ref to the textarea element for positioning */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MentionSuggestions({
  inputValue,
  cursorPos,
  channelId,
  conversationId,
  onSelect,
  onDismiss,
  textareaRef,
}: MentionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect @mention query from input
  useEffect(() => {
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    // Find the last @ that starts a mention (after start of string or whitespace)
    const match = textBeforeCursor.match(/(^|[\s])@([a-zA-Z0-9_.\-]*)$/);
    if (match) {
      setQuery(match[2].toLowerCase());
      setSelectedIndex(0);
    } else {
      setQuery(null);
      setSuggestions([]);
    }
  }, [inputValue, cursorPos]);

  // Fetch matching members
  useEffect(() => {
    if (query === null) return;

    async function fetchMembers() {
      const supabase = createClient();

      if (channelId) {
        // Get channel members with profile data
        const { data: members } = await supabase
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", channelId);

        if (members && members.length > 0) {
          const userIds = members.map((m) => m.user_id);
          let profileQuery = supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", userIds)
            .not("username", "is", null);

          if (query) {
            profileQuery = profileQuery.or(
              `username.ilike.%${query}%,display_name.ilike.%${query}%`
            );
          }

          const { data: profiles } = await profileQuery.limit(8);
          setSuggestions(profiles || []);
        }
      } else if (conversationId) {
        // Get conversation members with profile data
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);

        if (members && members.length > 0) {
          const userIds = members.map((m) => m.user_id);
          let profileQuery = supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", userIds)
            .not("username", "is", null);

          if (query) {
            profileQuery = profileQuery.or(
              `username.ilike.%${query}%,display_name.ilike.%${query}%`
            );
          }

          const { data: profiles } = await profileQuery.limit(8);
          setSuggestions(profiles || []);
        }
      }
    }

    fetchMembers();
  }, [query, channelId, conversationId]);

  // Handle keyboard navigation
  useEffect(() => {
    if (query === null || suggestions.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          selectMention(suggestions[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [query, suggestions, selectedIndex, onDismiss]);

  function selectMention(member: MemberSuggestion) {
    if (!member.username) return;

    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(^|[\s])@([a-zA-Z0-9_.\-]*)$/);
    if (!match) return;

    // Replace the @partial with @username
    const mentionStart = textBeforeCursor.lastIndexOf("@" + match[2]);
    const before = inputValue.slice(0, mentionStart);
    const after = inputValue.slice(cursorPos);
    const mention = `@${member.username} `;
    const newValue = before + mention + after;
    const newCursorPos = before.length + mention.length;

    onSelect(newValue, newCursorPos);
    setQuery(null);
    setSuggestions([]);
  }

  if (query === null || suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 z-50 mb-1 w-[240px] rounded-lg border border-border bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
    >
      <p className="px-3 py-1 text-[11px] font-medium text-muted-foreground">
        Members matching @{query}
      </p>
      {suggestions.map((member, i) => (
        <button
          key={member.id}
          onMouseDown={(e) => {
            e.preventDefault();
            selectMention(member);
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
            i === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
          )}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
              {(member.display_name || member.username || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {member.display_name || member.username}
            </p>
            {member.username && (
              <p className="truncate text-[11px] text-muted-foreground">
                @{member.username}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
