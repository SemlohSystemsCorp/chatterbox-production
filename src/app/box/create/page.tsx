"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Hash, Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CreateBoxPageWrapper() {
  return (
    <Suspense>
      <CreateBoxPage />
    </Suspense>
  );
}

function generateNumericCode(length: number): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

const WORKSPACE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function CreateBoxPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = name.trim()[0]?.toUpperCase() || "";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Generate unique 8-digit numeric code
    let boxSlug = generateNumericCode(8);
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("boxes")
        .select("id")
        .eq("slug", boxSlug)
        .single();
      if (!existing) break;
      boxSlug = generateNumericCode(8);
      attempts++;
    }

    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert({
        name: name.trim(),
        slug: boxSlug,
        description: description.trim() || null,
        created_by: user.id,
        color,
      })
      .select("id")
      .single();

    if (boxError || !box) {
      setError(boxError?.message ?? "Failed to create workspace.");
      setIsLoading(false);
      return;
    }

    await supabase.from("box_members").insert({ box_id: box.id, user_id: user.id });

    // Default #general channel with numeric slug
    let channelSlug = generateNumericCode(6);
    let chAttempts = 0;
    while (chAttempts < 10) {
      const { data: existing } = await supabase
        .from("channels")
        .select("id")
        .eq("slug", channelSlug)
        .single();
      if (!existing) break;
      channelSlug = generateNumericCode(6);
      chAttempts++;
    }

    const { data: channel } = await supabase
      .from("channels")
      .insert({
        box_id: box.id,
        name: "general",
        slug: channelSlug,
        description: "General discussion",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (channel) {
      await supabase.from("channel_members").insert({ channel_id: channel.id, user_id: user.id });
    }

    router.push(`/box/${boxSlug}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ds-bg)",
      padding: "32px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Back link */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ds-muted)", textDecoration: "none" }}
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </Link>
        </div>

        {/* Preview card */}
        {name.trim() && (
          <div style={{
            marginBottom: 16,
            background: "var(--ds-surface)",
            border: "1px solid var(--ds-border)",
            borderRadius: 12,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </p>
              <p style={{ fontSize: 12, color: "var(--ds-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Hash size={10} />
                general
              </p>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="card card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Sparkles size={16} color="var(--ds-primary)" />
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--ds-heading)", margin: 0 }}>
              Create a workspace
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 22 }}>
            A workspace is where your team communicates. A <strong>#general</strong> channel will be created automatically.
          </p>

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="name">Workspace name</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Acme Corp, Engineering, Side Project…"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                required
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="description">
                Description
                <span style={{ fontWeight: 400, color: "var(--ds-muted)", marginLeft: 4 }}>(optional)</span>
              </label>
              <input
                id="description"
                type="text"
                className="input"
                placeholder="What's this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Color picker */}
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Color</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: color === c ? "2px solid var(--ds-text)" : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      outline: color === c ? "2px solid var(--ds-bg)" : "none",
                      outlineOffset: "-4px",
                    }}
                    aria-label={c}
                  >
                    {color === c && <Check size={12} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={isLoading || !name.trim()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {isLoading ? (
                <><span className="spinner spinner-sm spinner-white" /> Creating…</>
              ) : (
                <>Create workspace <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
