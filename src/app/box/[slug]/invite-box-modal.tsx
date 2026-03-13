"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
}

interface InviteBoxModalProps {
  boxId: string;
  boxName: string;
  boxSlug: string;
  channels: Channel[];
  onClose: () => void;
}

export function InviteBoxModal({
  boxName,
  boxSlug,
  channels,
  onClose,
}: InviteBoxModalProps) {
  const [copied, setCopied] = useState(false);

  const publicChannels = channels.filter((c) => !c.is_private);
  const privateChannels = channels.filter((c) => c.is_private);

  async function handleCopy() {
    await navigator.clipboard.writeText(boxSlug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[440px] rounded-lg border border-border bg-white shadow-[0_16px_70px_rgba(0,0,0,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Invite people to {boxName}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share this code so others can join your workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Invite code */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              Workspace code
            </label>
            <div className="flex gap-2">
              <div className="flex h-9 flex-1 items-center rounded-md border border-border bg-accent/50 px-3 font-mono text-sm text-foreground tracking-widest">
                {boxSlug}
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                  copied
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-border bg-white text-foreground hover:bg-accent"
                )}
              >
                {copied ? (
                  <><Check className="h-3.5 w-3.5" /> Copied</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy</>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Anyone with this code can join your workspace at{" "}
              <span className="font-medium text-foreground">/join/box</span>.
            </p>
          </div>

          {/* Channel info */}
          {(publicChannels.length > 0 || privateChannels.length > 0) && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground">
                Channel access
              </p>
              {publicChannels.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Public — auto-joined
                  </p>
                  <div className="space-y-1">
                    {publicChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground"
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        <span>{ch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {privateChannels.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Private — invite only
                  </p>
                  <div className="space-y-1">
                    {privateChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>{ch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
