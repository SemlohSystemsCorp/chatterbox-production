"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, Circle, Users, Pencil, Trash2, X, Check, Smile, MessageSquare, Paperclip, FileText } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThreadPanel } from "../../thread-panel";
import { MentionSuggestions } from "../../mention-suggestions";
import { AttachmentList } from "@/components/media-preview";
import { checkUploadAllowed } from "../../actions";

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
}

interface Message {
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
  reply_count: number;
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

interface Participant {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  status: string;
}

export interface DmChatProps {
  conversationId: string;
  boxId: string;
  isGroup: boolean;
  groupName: string | null;
  participants: Participant[];
  initialMessages: Message[];
  currentUserId: string;
}

export function DmChat({
  conversationId,
  boxId,
  isGroup,
  groupName,
  participants,
  initialMessages,
  currentUserId,
}: DmChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [cursorPos, setCursorPos] = useState(0);

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
    if (top + pickerHeight > window.innerHeight) {
      top = rect.top - pickerHeight - 4;
    }
    if (left < 8) left = 8;
    setEmojiPickerPos({ top, left });
    setEmojiPickerMsgId(msgId);
  }, [emojiPickerMsgId]);

  // For 1:1 DMs, use the single partner; for groups, build a name from participants
  const partner = !isGroup && participants.length === 1 ? participants[0] : null;
  const headerName = isGroup
    ? groupName || participants.map((p) => p.displayName || p.username || "Unknown").join(", ")
    : partner?.displayName || partner?.username || "Unknown";
  const partnerName = headerName;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to realtime messages (INSERT + UPDATE)
  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const msg = payload.new as any;

          if (msg.thread_id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.thread_id ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m
              )
            );
            return;
          }

          let profile = null;
          if (msg.user_id) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("id", msg.user_id)
              .single();
            profile = data;
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                content: msg.content,
                created_at: msg.created_at,
                is_edited: msg.is_edited,
                is_deleted: msg.is_deleted,
                user_id: msg.user_id,
                profile,
                reactions: [],
                reply_count: 0,
                attachments: [],
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? { ...m, content: msg.content, is_edited: msg.is_edited, is_deleted: msg.is_deleted }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reactions",
        },
        (payload) => {
          const r = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === r.message_id
                ? {
                    ...m,
                    reactions: m.reactions.some((rx) => rx.id === r.id)
                      ? m.reactions
                      : [...m.reactions, { id: r.id, user_id: r.user_id, emoji: r.emoji }],
                  }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "reactions",
        },
        (payload) => {
          const r = payload.old as any;
          if (r.id) {
            setMessages((prev) =>
              prev.map((m) => ({
                ...m,
                reactions: m.reactions.filter((rx) => rx.id !== r.id),
              }))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attachments",
        },
        (payload) => {
          const att = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === att.message_id && !m.attachments.some((a) => a.id === att.id)
                ? {
                    ...m,
                    attachments: [
                      ...m.attachments,
                      {
                        id: att.id,
                        file_name: att.file_name,
                        file_url: att.file_url,
                        file_type: att.file_type,
                        file_size: att.file_size,
                      },
                    ],
                  }
                : m
            )
          );
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log(`[Realtime] dm:${conversationId}:`, status, err ?? "");
      });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [conversationId]);

  // Close emoji picker on click outside
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
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const existing = msg.reactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existing) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) }
            : m
        )
      );
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      const tempId = crypto.randomUUID();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                reactions: [...m.reactions, { id: tempId, user_id: currentUserId, emoji }],
              }
            : m
        )
      );
      const { data } = await supabase
        .from("reactions")
        .insert({ message_id: msgId, user_id: currentUserId, emoji })
        .select("id")
        .single();
      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  reactions: m.reactions.map((r) =>
                    r.id === tempId ? { ...r, id: data.id } : r
                  ),
                }
              : m
          )
        );
      }
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    const filesToUpload = [...pendingFiles];
    if ((!text && filesToUpload.length === 0) || sending) return;

    setSending(true);
    setInput("");
    setPendingFiles([]);

    const supabase = createClient();

    const tempId = crypto.randomUUID();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", currentUserId)
      .single();

    const optimisticAttachments: Attachment[] = filesToUpload.map((f) => ({
      id: crypto.randomUUID(),
      file_name: f.name,
      file_url: URL.createObjectURL(f),
      file_type: f.type || null,
      file_size: f.size,
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content: text,
        created_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        user_id: currentUserId,
        profile: myProfile,
        reactions: [],
        reply_count: 0,
        attachments: optimisticAttachments,
      },
    ]);

    const { data: msg } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: currentUserId,
        content: text,
      })
      .select("id")
      .single();

    if (msg) {
      // Check storage quota before uploading
      const totalBytes = filesToUpload.reduce((sum, f) => sum + f.size, 0);
      if (filesToUpload.length > 0 && totalBytes > 0) {
        const check = await checkUploadAllowed(boxId, totalBytes);
        if (!check.allowed) {
          alert(check.error || "Storage limit reached. Ask the workspace owner to upgrade.");
          setSending(false);
          return;
        }
      }

      const realAttachments: Attachment[] = [];
      for (const file of filesToUpload) {
        const ext = file.name.split(".").pop();
        const path = `${conversationId}/${msg.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(path, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("message-attachments")
            .getPublicUrl(path);

          const { data: att } = await supabase
            .from("attachments")
            .insert({
              message_id: msg.id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type || null,
              file_size: file.size,
            })
            .select("id, file_name, file_url, file_type, file_size")
            .single();

          if (att) realAttachments.push(att);
        }
      }

      setMessages((prev) => {
        const realtimeAlreadyAdded = prev.some((m) => m.id === msg.id);
        if (realtimeAlreadyAdded) {
          return prev
            .filter((m) => m.id !== tempId)
            .map((m) =>
              m.id === msg.id
                ? { ...m, attachments: realAttachments.length ? realAttachments : m.attachments }
                : m
            );
        }
        return prev.map((m) =>
          m.id === tempId
            ? { ...m, id: msg.id, attachments: realAttachments.length ? realAttachments : m.attachments }
            : m
        );
      });
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function startEditing(msg: Message) {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function handleEditSave(msgId: string) {
    const text = editContent.trim();
    if (!text) return;
    setEditingId(null);

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: text, is_edited: true } : m))
    );

    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ content: text, is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", msgId);
  }

  async function handleDelete(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m))
    );

    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ is_deleted: true })
      .eq("id", msgId);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }


  function renderContent(text: string) {
    const parts = text.split(/(@[a-zA-Z0-9_.\-]+)/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="font-semibold text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  }

  function handleInputSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    setCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    }
    e.target.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date, messages: [msg] });
    }
  });

  const activeThreadMsg = activeThreadId ? messages.find((m) => m.id === activeThreadId) : null;

  return (
    <div className="flex flex-1 overflow-hidden">
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* DM header */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-3">
        {isGroup ? (
          <div className="flex -space-x-2">
            {participants.slice(0, 3).map((p) =>
              p.avatarUrl ? (
                <img
                  key={p.id}
                  src={p.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div
                  key={p.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary/10 text-xs font-medium text-primary"
                >
                  {(p.displayName || p.username || "?")[0].toUpperCase()}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="relative">
            {partner?.avatarUrl ? (
              <img
                src={partner.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {partnerName[0].toUpperCase()}
              </div>
            )}
            <Circle
              className={cn(
                "absolute -bottom-px -right-px h-2.5 w-2.5 fill-current",
                partner?.status === "online"
                  ? "text-success"
                  : "text-muted-foreground/30"
              )}
              strokeWidth={3}
              stroke="white"
            />
          </div>
        )}
        <div>
          <h1 className="text-sm font-semibold text-foreground">
            {headerName}
          </h1>
          {!isGroup && partner?.username && (
            <p className="text-[11px] text-muted-foreground">
              @{partner.username}
            </p>
          )}
          {isGroup && (
            <p className="text-[11px] text-muted-foreground">
              {participants.length + 1} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            {isGroup ? (
              <div className="flex -space-x-3">
                {participants.slice(0, 3).map((p) =>
                  p.avatarUrl ? (
                    <img
                      key={p.id}
                      src={p.avatarUrl}
                      alt=""
                      className="h-14 w-14 rounded-full border-2 border-white object-cover"
                    />
                  ) : (
                    <div
                      key={p.id}
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-primary/10 text-lg font-semibold text-primary"
                    >
                      {(p.displayName || p.username || "?")[0].toUpperCase()}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="relative">
                {partner?.avatarUrl ? (
                  <img
                    src={partner.avatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {partnerName[0].toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <h2 className="mt-3 text-base font-semibold text-foreground">
              {headerName}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isGroup
                ? "This is the start of this group conversation."
                : `This is the start of your conversation with ${partnerName}.`}
            </p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded-full border border-border bg-white px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {formatDate(group.messages[0].created_at)}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {group.messages.map((msg, i) => {
              const prevMsg = i > 0 ? group.messages[i - 1] : null;
              const sameAuthor = prevMsg?.user_id === msg.user_id;
              const withinMinute =
                prevMsg &&
                new Date(msg.created_at).getTime() -
                  new Date(prevMsg.created_at).getTime() <
                  60000;
              const compact = sameAuthor && withinMinute;
              const isOwn = msg.user_id === currentUserId;
              const isEditing = editingId === msg.id;

              if (msg.is_deleted) {
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 px-1 py-0.5",
                      !compact && i > 0 && "mt-3"
                    )}
                  >
                    <div className="w-8 shrink-0" />
                    <p className="text-sm italic text-muted-foreground/60">
                      This message was deleted.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group/msg relative flex gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-accent/50",
                    !compact && i > 0 && "mt-3"
                  )}
                >
                  {/* Hover actions */}
                  {!isEditing && (
                    <div className="absolute -top-3 right-1 z-10 hidden items-center gap-px rounded-md border border-border bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] group-hover/msg:flex">
                      <button
                        onClick={(e) => openEmojiPicker(msg.id, e.currentTarget)}
                        className="rounded-l-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Add reaction"
                      >
                        <Smile className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setActiveThreadId(msg.id)}
                        className={cn(
                          "p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          !isOwn && "rounded-r-md"
                        )}
                        title="Reply in thread"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                      {isOwn && (
                        <>
                          <button
                            onClick={() => startEditing(msg)}
                            className="p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Edit message"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="rounded-r-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Emoji picker */}
                  {emojiPickerMsgId === msg.id && emojiPickerPos && (
                    <div
                      ref={emojiPickerRef}
                      className="fixed z-50"
                      style={{ top: emojiPickerPos.top, left: emojiPickerPos.left }}
                    >
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

                  <div className="w-8 shrink-0">
                    {!compact && (
                      <>
                        {msg.profile?.avatar_url ? (
                          <img
                            src={msg.profile.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {(
                              msg.profile?.display_name ||
                              msg.profile?.username ||
                              "?"
                            )[0].toUpperCase()}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {!compact && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {msg.profile?.display_name ||
                            msg.profile?.username ||
                            "Unknown"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                        {msg.is_edited && (
                          <span className="text-[10px] text-muted-foreground">
                            (edited)
                          </span>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="mt-0.5">
                        <textarea
                          ref={editInputRef}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEditSave(msg.id);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          rows={1}
                          className="w-full resize-none rounded-md border border-primary bg-white px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditSave(msg.id)}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            Esc to cancel
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                        {renderContent(msg.content)}
                      </p>
                    )}
                    {/* Attachments */}
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
                    {/* Thread reply count */}
                    {msg.reply_count > 0 && (
                      <button
                        onClick={() => setActiveThreadId(msg.id)}
                        className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {msg.reply_count} {msg.reply_count === 1 ? "reply" : "replies"}
                      </button>
                    )}
                  </div>

                  {compact && !isEditing && (
                    <span className="hidden shrink-0 pt-0.5 text-[10px] text-muted-foreground group-hover/msg:inline">
                      {formatTime(msg.created_at)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-border bg-white px-5 py-3">
        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((file, i) => {
              const isImage = file.type.startsWith("image/");
              return (
                <div
                  key={i}
                  className="group/file relative flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-2.5 py-1.5"
                >
                  {isImage ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="max-w-[120px] truncate text-xs text-foreground">{file.name}</span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <form onSubmit={handleSend} className="relative">
          <MentionSuggestions
            inputValue={input}
            cursorPos={cursorPos}
            conversationId={conversationId}
            onSelect={(newVal, newCursor) => {
              setInput(newVal);
              setCursorPos(newCursor);
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.selectionStart = newCursor;
                  inputRef.current.selectionEnd = newCursor;
                  inputRef.current.focus();
                }
              }, 0);
            }}
            onDismiss={() => setCursorPos(0)}
            textareaRef={inputRef}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip,.json,.mp4,.mov,.mp3,.wav"
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={handleInputSelect}
            placeholder={`Message ${partnerName}`}
            rows={1}
            className="w-full resize-none rounded-lg border border-border bg-white px-4 py-2.5 pr-20 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={(!input.trim() && pendingFiles.length === 0) || sending}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                input.trim() || pendingFiles.length > 0
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/40"
              )}
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </form>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          <kbd className="rounded border border-border bg-accent px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send, <kbd className="rounded border border-border bg-accent px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>

    {/* Thread panel */}
    {activeThreadMsg && (
      <ThreadPanel
        parentMessage={activeThreadMsg}
        conversationId={conversationId}
        currentUserId={currentUserId}
        onClose={() => setActiveThreadId(null)}
        onReplyCountChange={(threadId: string, count: number) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === threadId ? { ...m, reply_count: count } : m))
          );
        }}
      />
    )}
    </div>
  );
}
