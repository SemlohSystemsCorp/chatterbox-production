"use client";

import { useState, useRef, useEffect } from "react";
import { X, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CreateChannelModalProps {
  boxId: string;
  boxSlug: string;
  onClose: () => void;
}

function generateCode(length: number): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export function CreateChannelModal({ boxId, boxSlug, onClose }: CreateChannelModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!cleaned) {
      setError("Channel name is required.");
      return;
    }
    if (cleaned.length > 50) {
      setError("Channel name must be 50 characters or less.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate unique 6-digit channel code
    let channelSlug = generateCode(6);
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("channels")
        .select("id")
        .eq("slug", channelSlug)
        .single();
      if (!existing) break;
      channelSlug = generateCode(6);
      attempts++;
    }

    const { data: channel, error: chError } = await supabase
      .from("channels")
      .insert({
        box_id: boxId,
        name: cleaned,
        slug: channelSlug,
        description: description.trim() || null,
        is_private: isPrivate,
        created_by: user.id,
      })
      .select("id, slug")
      .single();

    if (chError) {
      setError(chError.message);
      setIsLoading(false);
      return;
    }

    if (channel) {
      await supabase.from("channel_members").insert({
        channel_id: channel.id,
        user_id: user.id,
      });
      router.push(`/box/${boxSlug}/c/${channel.slug}`);
      router.refresh();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[440px] rounded-lg border border-border bg-white shadow-[0_16px_70px_rgba(0,0,0,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Create a channel</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleCreate} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="channelName" className="mb-1.5 block text-sm font-medium text-foreground">
              Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
              </span>
              <input
                ref={inputRef}
                id="channelName"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. design-reviews"
                className="flex h-9 w-full rounded-md border border-border bg-white pl-8 pr-3 py-1.5 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="channelDescription" className="mb-1.5 block text-sm font-medium text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="channelDescription"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="flex h-9 w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Private toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/50">
            <div className="relative">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Make private</p>
              <p className="text-xs text-muted-foreground">Only invited members can see this channel</p>
            </div>
          </label>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isLoading} disabled={!name.trim()}>
              Create channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
