"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createGroupDm } from "./actions";

interface Member {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface CreateGroupDmModalProps {
  boxId: string;
  boxSlug: string;
  currentUserId: string;
  members: Member[];
  onClose: () => void;
}

export function CreateGroupDmModal({
  boxId,
  boxSlug,
  currentUserId,
  members,
  onClose,
}: CreateGroupDmModalProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleMember(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  const filtered = members.filter(
    (m) =>
      m.userId !== currentUserId &&
      (m.displayName || m.username || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size < 2) {
      setError("Select at least 2 people for a group conversation.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const groupName =
      name.trim() ||
      [...selected]
        .map((id) => {
          const m = members.find((m) => m.userId === id);
          return m?.displayName || m?.username || "Unknown";
        })
        .join(", ");

    const result = await createGroupDm(boxId, [...selected], groupName);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(`/box/${boxSlug}/dm/${result.slug}`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[440px] rounded-lg border border-border bg-white shadow-[0_16px_70px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            New group message
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="px-5 py-4">
          <div className="mb-3">
            <label
              htmlFor="groupName"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Group name{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              id="groupName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design team"
              className="flex h-9 w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mb-1.5">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Members
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex h-9 w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="max-h-[240px] overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No members found
              </p>
            )}
            {filtered.map((m) => {
              const isSelected = selected.has(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => toggleMember(m.userId)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      (m.displayName || m.username || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {m.displayName || m.username || "Unknown"}
                    </p>
                    {m.username && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        @{m.username}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          {selected.size > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {selected.size} selected
            </p>
          )}

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isLoading}
              disabled={selected.size < 2}
            >
              Create group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
