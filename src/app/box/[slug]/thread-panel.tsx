"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, SendHorizontal, Pencil, Trash2, Check, Smile } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AttachmentList } from "@/components/media-preview";

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

interface ThreadMessage {
  id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  user_id: string | null;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  reactions: Reaction[];
  attachments: Attachment[];
}

interface ThreadPanelProps {
  parentMessage: ThreadMessage;
  channelId?: string;
  conversationId?: string;
  currentUserId: string;
  onClose: () => void;
  onReplyCountChange?: (threadId: string, count: number) => void;
}

export function ThreadPanel({
  parentMessage,
  channelId,
  conversationId,
  currentUserId,
  onClose,
  onReplyCountChange,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const openEmojiPicker = useCallback((msgId: string, button: HTMLButtonElement) => {
    if (emojiPickerMsgId === msgId) {
      setEmojiPickerMsgId(null);
      setEmojiPickerPos(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const pickerHeight = 435;
    const pickerWidth = 352;
    let top = rect.bottom + 4;
    let left = rect.left - pickerWidth + rect.width;
    if (top + pickerHeight > window.innerHeight) top = rect.top - pickerHeight - 4;
    if (left < 8) left = 8;
    setEmojiPickerPos({ top, left });
    setEmojiPickerMsgId(msgId);
  }, [emojiPickerMsgId]);

  // Fetch thread replies
  useEffect(() => {
    async function fetchReplies() {
      const supabase = createClient();
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, created_at, is_edited, is_deleted, user_id")
        .eq("thread_id", parentMessage.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (messages) {
        const messageIds = messages.map((m) => m.id);
        const userIds = [...new Set(messages.map((m) => m.user_id).filter(Boolean))] as string[];

        const [{ data: profiles }, { data: attachments }, { data: reactions }] = await Promise.all([
          userIds.length
            ? supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)
            : Promise.resolve({ data: [] as any[] }),
          messageIds.length
            ? supabase.from("attachments").select("id, message_id, file_name, file_url, file_type, file_size").in("message_id", messageIds)
            : Promise.resolve({ data: [] as any[] }),
          messageIds.length
            ? supabase.from("reactions").select("id, message_id, user_id, emoji").in("message_id", messageIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const profileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
        });

        const attachmentsMap: Record<string, Attachment[]> = {};
        (attachments || []).forEach((a: any) => {
          if (!attachmentsMap[a.message_id]) attachmentsMap[a.message_id] = [];
          attachmentsMap[a.message_id].push(a);
        });

        const reactionsMap: Record<string, Reaction[]> = {};
        (reactions || []).forEach((r: any) => {
          if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
          reactionsMap[r.message_id].push({ id: r.id, user_id: r.user_id, emoji: r.emoji });
        });

        setReplies(
          messages.map((m) => ({
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            is_edited: m.is_edited,
            is_deleted: m.is_deleted,
            user_id: m.user_id,
            profile: m.user_id ? profileMap[m.user_id] || null : null,
            reactions: reactionsMap[m.id] || [],
            attachments: attachmentsMap[m.id] || [],
          }))
        );
      }
      setLoading(false);
    }

    fetchReplies();
  }, [parentMessage.id]);

  // Sync reply count to parent
  useEffect(() => {
    if (!loading) {
      onReplyCountChange?.(parentMessage.id, replies.length);
    }
  }, [replies.length, loading]);

  // Scroll to bottom on new replies
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(`thread:${parentMessage.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${parentMessage.id}` },
        async (payload) => {
          const msg = payload.new as any;
          let profile = null;
          if (msg.user_id) {
            const { data } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("id", msg.user_id).single();
            profile = data;
          }
          const { data: attachments } = await supabase.from("attachments").select("id, file_name, file_url, file_type, file_size").eq("message_id", msg.id);

          setReplies((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, { id: msg.id, content: msg.content, created_at: msg.created_at, is_edited: msg.is_edited, is_deleted: msg.is_deleted, user_id: msg.user_id, profile, reactions: [], attachments: attachments || [] }];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${parentMessage.id}` },
        (payload) => {
          const msg = payload.new as any;
          setReplies((prev) =>
            prev.map((m) => m.id === msg.id ? { ...m, content: msg.content, is_edited: msg.is_edited, is_deleted: msg.is_deleted } : m)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const r = payload.new as any;
          setReplies((prev) =>
            prev.map((m) =>
              m.id === r.message_id
                ? { ...m, reactions: m.reactions.some((rx) => rx.id === r.id) ? m.reactions : [...m.reactions, { id: r.id, user_id: r.user_id, emoji: r.emoji }] }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          const r = payload.old as any;
          if (r.id) {
            setReplies((prev) => prev.map((m) => ({ ...m, reactions: m.reactions.filter((rx) => rx.id !== r.id) })));
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log(`[Realtime] thread:${parentMessage.id}:`, status, err ?? "");
      });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [parentMessage.id]);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerMsgId(null);
        setEmojiPickerPos(null);
      }
    }
    if (emojiPickerMsgId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [emojiPickerMsgId]);

  async function toggleReaction(msgId: string, emoji: string) {
    const supabase = createClient();
    const msg = replies.find((m) => m.id === msgId);
    if (!msg) return;

    const existing = msg.reactions.find((r) => r.emoji === emoji && r.user_id === currentUserId);
    if (existing) {
      setReplies((prev) => prev.map((m) => m.id === msgId ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) } : m));
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      const tempId = crypto.randomUUID();
      setReplies((prev) => prev.map((m) => m.id === msgId ? { ...m, reactions: [...m.reactions, { id: tempId, user_id: currentUserId, emoji }] } : m));
      const { data } = await supabase.from("reactions").insert({ message_id: msgId, user_id: currentUserId, emoji }).select("id").single();
      if (data) {
        setReplies((prev) => prev.map((m) => m.id === msgId ? { ...m, reactions: m.reactions.map((r) => r.id === tempId ? { ...r, id: data.id } : r) } : m));
      }
    }
  }

  function startEditing(msg: ThreadMessage) {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function handleEditSave(msgId: string) {
    const text = editContent.trim();
    if (!text) return;
    setEditingId(null);
    setReplies((prev) => prev.map((m) => m.id === msgId ? { ...m, content: text, is_edited: true } : m));
    const supabase = createClient();
    await supabase.from("messages").update({ content: text, is_edited: true, edited_at: new Date().toISOString() }).eq("id", msgId);
  }

  async function handleDelete(msgId: string) {
    setReplies((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true } : m));
    const supabase = createClient();
    await supabase.from("messages").update({ is_deleted: true }).eq("id", msgId);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const supabase = createClient();
    const tempId = crypto.randomUUID();
    const { data: myProfile } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("id", currentUserId).single();

    setReplies((prev) => [
      ...prev,
      { id: tempId, content: text, created_at: new Date().toISOString(), is_edited: false, is_deleted: false, user_id: currentUserId, profile: myProfile, reactions: [], attachments: [] },
    ]);

    const insertData: Record<string, string> = { user_id: currentUserId, content: text, thread_id: parentMessage.id };
    if (channelId) insertData.channel_id = channelId;
    if (conversationId) insertData.conversation_id = conversationId;

    const { data: msg } = await supabase.from("messages").insert(insertData).select("id").single();
    if (msg) {
      setReplies((prev) => prev.map((m) => m.id === tempId ? { ...m, id: msg.id } : m));
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function renderMessage(msg: ThreadMessage, isParent = false) {
    if (msg.is_deleted) {
      return (
        <div className="flex gap-3 px-4 py-1">
          <div className="w-8 shrink-0" />
          <p className="text-sm italic text-muted-foreground/60">This message was deleted.</p>
        </div>
      );
    }

    const isOwn = msg.user_id === currentUserId;
    const isEditing = editingId === msg.id;

    return (
      <div className={cn("group/reply relative flex gap-3 px-4 py-2 transition-colors hover:bg-accent/40", isParent && "bg-accent/30 hover:bg-accent/30")}>
        {/* Hover actions — only on replies, not parent */}
        {!isParent && !isEditing && (
          <div className="absolute -top-3 right-2 z-10 hidden items-center gap-px rounded-md border border-border bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] group-hover/reply:flex">
            <button
              onClick={(e) => openEmojiPicker(msg.id, e.currentTarget)}
              className="rounded-l-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Add reaction"
            >
              <Smile className="h-3 w-3" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => startEditing(msg)}
                  className="p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Edit reply"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="rounded-r-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete reply"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
            {!isOwn && <span className="rounded-r-md" />}
          </div>
        )}

        {/* Emoji picker */}
        {emojiPickerMsgId === msg.id && emojiPickerPos && (
          <div ref={emojiPickerRef} className="fixed z-50" style={{ top: emojiPickerPos.top, left: emojiPickerPos.left }}>
            <Picker
              data={data}
              onEmojiSelect={(emoji: any) => {
                toggleReaction(msg.id, emoji.native);
                setEmojiPickerMsgId(null);
                setEmojiPickerPos(null);
              }}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={1}
            />
          </div>
        )}

        {/* Avatar */}
        <div className="w-8 shrink-0">
          {msg.profile?.avatar_url ? (
            <img src={msg.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {(msg.profile?.display_name || msg.profile?.username || "?")[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {msg.profile?.display_name || msg.profile?.username || "Unknown"}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</span>
            {msg.is_edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
          </div>

          {isEditing ? (
            <div className="mt-0.5">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(msg.id); }
                  if (e.key === "Escape") setEditingId(null);
                }}
                rows={1}
                className="w-full resize-none rounded-md border border-primary bg-white px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="mt-1 flex items-center gap-1.5">
                <button onClick={() => handleEditSave(msg.id)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10">
                  <Check className="h-3 w-3" /> Save
                </button>
                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent">
                  <X className="h-3 w-3" /> Cancel
                </button>
                <span className="text-[10px] text-muted-foreground">Esc to cancel</span>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          <AttachmentList attachments={msg.attachments} />

          {/* Reactions */}
          {msg.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(
                msg.reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
                  acc[r.emoji].count++;
                  if (r.user_id === currentUserId) acc[r.emoji].userReacted = true;
                  return acc;
                }, {})
              ).map(([emoji, { count, userReacted }]) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(msg.id, emoji)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    userReacted
                      ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                      : "border-border bg-white text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-l border-border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Thread</h2>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderMessage(parentMessage, true)}

        <div className="my-2 flex items-center gap-3 px-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-medium text-muted-foreground">
            {loading ? "Loading…" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {replies.map((reply) => (
          <div key={reply.id}>{renderMessage(reply)}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-border px-4 py-3">
        <form onSubmit={handleSend} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
            }}
            placeholder="Reply…"
            rows={1}
            className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 pr-10 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors",
              input.trim() ? "text-primary hover:bg-primary/10" : "text-muted-foreground/40"
            )}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
