"use client";

import { useState, useEffect } from "react";
import { X, Lock, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface InviteChannelModalProps {
  channelId: string;
  channelName: string;
  boxId: string;
  onClose: () => void;
}

interface BoxMember {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isMember: boolean;
}

export function InviteChannelModal({ channelId, channelName, boxId, onClose }: InviteChannelModalProps) {
  const [members, setMembers] = useState<BoxMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get all box members
      const { data: boxMembers } = await supabase
        .from("box_members")
        .select("user_id")
        .eq("box_id", boxId);

      const userIds = (boxMembers || []).map((m) => m.user_id) as string[];

      // Get existing channel members
      const { data: channelMembers } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId);

      const channelMemberIds = new Set((channelMembers || []).map((m) => m.user_id));

      // Get profiles
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", userIds)
        : { data: [] };

      setMembers(
        (profiles || []).map((p) => ({
          userId: p.id,
          displayName: p.display_name,
          username: p.username,
          avatarUrl: p.avatar_url,
          isMember: channelMemberIds.has(p.id),
        }))
      );
      setLoading(false);
    }
    load();
  }, [boxId, channelId]);

  async function handleInvite(userId: string) {
    setInviting(userId);
    const supabase = createClient();

    await supabase.from("channel_members").insert({
      channel_id: channelId,
      user_id: userId,
    });

    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, isMember: true } : m))
    );
    setInviting(null);
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
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-[440px] rounded-lg border border-border bg-white shadow-[0_16px_70px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Invite to #{channelName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="h-5 w-5 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2.5">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {(member.displayName || member.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.displayName || member.username}
                      </p>
                      {member.username && (
                        <p className="text-[11px] text-muted-foreground">@{member.username}</p>
                      )}
                    </div>
                  </div>

                  {member.isMember ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="h-3 w-3" />
                      Member
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInvite(member.userId)}
                      isLoading={inviting === member.userId}
                      disabled={!!inviting}
                    >
                      <UserPlus className="h-3 w-3" />
                      Invite
                    </Button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No members found in this workspace.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Only invited members can see and post in private channels.
          </p>
        </div>
      </div>
    </div>
  );
}
