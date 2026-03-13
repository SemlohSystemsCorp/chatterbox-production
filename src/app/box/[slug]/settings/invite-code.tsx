"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <code style={{
        flex: 1,
        fontSize: 14,
        fontFamily: "monospace",
        letterSpacing: "0.12em",
        fontWeight: 600,
        color: "var(--ds-heading)",
        background: "var(--ds-bg)",
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: "8px 12px",
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {code}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="btn btn-secondary btn-sm"
        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
