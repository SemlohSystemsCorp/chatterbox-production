"use client";

import { useState, useTransition } from "react";
import { archiveBox, deleteBox } from "./actions";

interface Props {
  boxId: string;
  boxName: string;
  boxSlug: string;
  isOwner: boolean;
}

export function DangerBox({ boxId, boxName, boxSlug, isOwner }: Props) {
  const [mode, setMode] = useState<null | "archive" | "delete">(null);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(action: (f: FormData) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("boxId", boxId);
      fd.set("boxName", boxName);
      fd.set("boxSlug", boxSlug);
      fd.set("confirmation", confirmation);
      try {
        await action(fd);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  if (!mode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Archive — available to all admins */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", margin: 0 }}>
              Archive workspace
            </p>
            <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
              Hide this workspace. It can be restored later.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: "transparent",
              border: "1px solid color-mix(in srgb, #ef4444 40%, transparent)",
              color: "#ef4444",
              flexShrink: 0,
            }}
            onClick={() => setMode("archive")}
          >
            Archive
          </button>
        </div>

        {/* Delete — owner only */}
        {isOwner ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 12,
              borderTop: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", margin: 0 }}>
                Delete workspace
              </p>
              <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
                Permanently delete this workspace and all its messages.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: "transparent",
                border: "1px solid color-mix(in srgb, #ef4444 40%, transparent)",
                color: "#ef4444",
                flexShrink: 0,
              }}
              onClick={() => setMode("delete")}
            >
              Delete
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--ds-muted)", paddingTop: 8, borderTop: "1px solid color-mix(in srgb, #ef4444 20%, transparent)" }}>
            Only the workspace owner can delete this workspace.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--ds-text)", margin: 0 }}>
        {mode === "archive"
          ? "Archive this workspace? Members will lose access until it's restored."
          : <span>Type <strong>{boxName}</strong> to permanently delete this workspace.</span>}
      </p>

      {mode === "delete" && (
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={boxName}
          autoFocus
          className="input"
          style={{ borderColor: "#ef4444" }}
        />
      )}

      {error && (
        <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: "#ef4444", color: "#fff", border: "none" }}
          disabled={(mode === "delete" && confirmation !== boxName) || isPending}
          onClick={() => handleAction(mode === "archive" ? archiveBox : deleteBox)}
        >
          {isPending && <span className="spinner spinner-sm spinner-white" />}
          {mode === "archive" ? "Archive workspace" : "Delete workspace"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setMode(null);
            setConfirmation("");
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
