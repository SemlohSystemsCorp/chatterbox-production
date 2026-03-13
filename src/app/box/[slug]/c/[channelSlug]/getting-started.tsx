"use client";

import { useState, useEffect } from "react";
import { Check, Hash, MessageSquare, Users, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface GettingStartedProps {
  boxId: string;
  boxSlug: string;
  messageCount: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  autoCompleted?: boolean;
}

export function GettingStarted({ boxId, boxSlug, messageCount }: GettingStartedProps) {
  const storageKey = `cb_gs_${boxId}`;
  const [dismissed, setDismissed] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.dismissed) setDismissed(true);
        if (parsed.inviteDone) setInviteDone(true);
      }
    } catch {}
  }, [storageKey]);

  const messageSent = messageCount > 0;

  const allDone = inviteDone && messageSent;

  // Auto-celebrate and dismiss when all steps complete
  useEffect(() => {
    if (allDone && !dismissed) {
      setCelebrating(true);
      const t = setTimeout(() => {
        dismiss();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [allDone, dismissed]);

  function persist(updates: Record<string, boolean>) {
    try {
      const saved = localStorage.getItem(storageKey);
      const current = saved ? JSON.parse(saved) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...current, ...updates }));
    } catch {}
  }

  function dismiss() {
    setDismissed(true);
    persist({ dismissed: true });
  }

  function markInviteDone() {
    setInviteDone(true);
    persist({ inviteDone: true });
  }

  if (dismissed) return null;

  const items: ChecklistItem[] = [
    {
      id: "workspace",
      label: "Create your workspace",
      description: "You're in — your workspace is ready.",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      autoCompleted: true,
    },
    {
      id: "invite",
      label: "Invite your team",
      description: "Share an invite code so your teammates can join.",
      icon: <Users className="h-3.5 w-3.5" />,
      action: (
        <Link
          href={`/box/${boxSlug}/settings`}
          onClick={markInviteDone}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Workspace settings →
        </Link>
      ),
      autoCompleted: inviteDone,
    },
    {
      id: "message",
      label: "Send your first message",
      description: "Say hello in #general to get the conversation started.",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      autoCompleted: messageSent,
    },
    {
      id: "channel",
      label: "Create a channel",
      description: "Use the + next to Channels in the sidebar.",
      icon: <Hash className="h-3.5 w-3.5" />,
      autoCompleted: false,
    },
  ];

  const completedCount = items.filter((item) => item.autoCompleted).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="mx-auto my-8 w-full max-w-md">
      {celebrating ? (
        <div className="rounded-xl border border-[#00d084]/30 bg-[#00d084]/5 p-8 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm font-semibold text-foreground">You&apos;re all set!</p>
          <p className="mt-1 text-xs text-muted-foreground">Time to get chatting.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Get started with Chatterbox</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completedCount} of {items.length} steps completed
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={dismiss}
              className="ml-4 mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Checklist */}
          <div className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 px-5 py-3.5 transition-colors",
                  item.autoCompleted && "opacity-50"
                )}
              >
                {/* Check circle */}
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    item.autoCompleted
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-transparent"
                  )}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-medium", item.autoCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
                      {item.label}
                    </span>
                  </div>
                  {!item.autoCompleted && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  )}
                  {!item.autoCompleted && item.action && (
                    <div className="mt-1.5">{item.action}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 pb-4" />
        </div>
      )}
    </div>
  );
}
