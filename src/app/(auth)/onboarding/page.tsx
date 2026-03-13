"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, ArrowRight, AtSign, ArrowLeft, Plus, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { joinBoxByCode, setUsernameOnboarding } from "@/app/(auth)/actions";

type Step =
  | "loading"
  | "set_username"
  | "choose_path"
  | "create_workspace"
  | "join_workspace";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 999,
              height: 6,
              width: i + 1 === current ? 24 : 6,
              background: i + 1 <= current ? "var(--ds-primary)" : "var(--ds-border)",
              opacity: i + 1 < current ? 0.4 : 1,
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--ds-muted)", fontWeight: 500, letterSpacing: "0.02em" }}>
        STEP {current} OF {total}
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [step, setStep] = useState<Step>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  // Step 1: username
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Step 2c: create workspace
  const [workspaceName, setWorkspaceName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Step 2j: join workspace
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }

      if (profile?.username) {
        // Already has username — check if they have a box
        const { data: boxMembership } = await supabase
          .from("box_members")
          .select("box_id, boxes(slug)")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        const boxSlug = (boxMembership as any)?.boxes?.slug;
        if (boxSlug) {
          window.location.href = `/box/${boxSlug}`;
          return;
        }

        setStep("choose_path");
      } else {
        setStep("set_username");
      }
    }

    load();
  }, []);

  async function handleSetUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUsernameError(null);
    setIsSavingUsername(true);

    const result = await setUsernameOnboarding(username);

    if (result.error) {
      setUsernameError(result.error);
      setIsSavingUsername(false);
      return;
    }

    setIsSavingUsername(false);

    if (next && next.startsWith("/")) {
      router.push(next);
      return;
    }

    setStep("choose_path");
  }

  async function handleCreateWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    const name = workspaceName.trim();
    if (!name) return;

    setIsCreating(true);
    const supabase = createClient();

    const slug = Math.random().toString(36).slice(2, 10);

    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert({ name, slug, created_by: userId! })
      .select("id, slug")
      .single();

    if (boxError || !box) {
      setCreateError(boxError?.message ?? "Failed to create workspace.");
      setIsCreating(false);
      return;
    }

    await supabase.from("box_members").insert({ box_id: box.id, user_id: userId! });

    const channelSlug = "general";
    const { data: channel } = await supabase
      .from("channels")
      .insert({ box_id: box.id, name: "general", slug: channelSlug, created_by: userId! })
      .select("id")
      .single();

    if (channel) {
      await supabase
        .from("channel_members")
        .insert({ channel_id: channel.id, user_id: userId! });
    }

    router.push(`/box/${box.slug}`);
  }

  async function handleJoinWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinError(null);
    setIsJoining(true);

    const result = await joinBoxByCode(joinCode.trim());

    if (result.error) {
      setJoinError(result.error);
      setIsJoining(false);
      return;
    }

    router.push(`/box/${result.boxSlug}`);
  }

  const firstName = displayName?.split(" ")[0] || "";
  const avatarLetter = (displayName || username || "?")[0].toUpperCase();

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <span className="spinner" />
      </div>
    );
  }

  // ── Step 1: pick username ─────────────────────────────────────────────────────

  if (step === "set_username") {
    return (
      <>
        <StepIndicator current={1} total={2} />

        <div className="auth-card">
          <div style={{ textAlign: "center", marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--ds-border)" }}>
            <div
              className="avatar"
              style={{ margin: "0 auto 14px", width: 56, height: 56, fontSize: 22, fontWeight: 700, borderRadius: 14 }}
            >
              {avatarLetter}
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)" }}>
              {firstName ? `Hey ${firstName}, pick a username` : "Pick your username"}
            </p>
            <p style={{ marginTop: 5, fontSize: 13, color: "var(--ds-muted)" }}>
              This is how teammates find and @mention you.
            </p>
          </div>

          <form onSubmit={handleSetUsername}>
            <div className="field">
              <label className="label" htmlFor="username">Username</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ds-muted)",
                  pointerEvents: "none",
                  userSelect: "none",
                }}>
                  @
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                    setUsernameError(null);
                  }}
                  placeholder="janedoe"
                  required
                  minLength={3}
                  maxLength={20}
                  autoFocus
                  className={`input${usernameError ? " input-error" : ""}`}
                  style={{ paddingLeft: 26 }}
                />
              </div>
              {usernameError ? (
                <p className="field-error">{usernameError}</p>
              ) : (
                <p className="field-hint">3–20 chars · letters, numbers, hyphens, underscores</p>
              )}
            </div>

            {username.length >= 3 && !usernameError && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span className="username-preview">
                  <AtSign size={12} />
                  {username}
                </span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isSavingUsername}>
              {isSavingUsername ? (
                <><span className="spinner spinner-sm spinner-white" /> Saving…</>
              ) : (
                <>Continue <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>
      </>
    );
  }

  // ── Step 2: choose path ───────────────────────────────────────────────────────

  if (step === "choose_path") {
    return (
      <>
        <StepIndicator current={2} total={2} />

        <div className="auth-card">
          <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--ds-border)" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)" }}>
              Set up your workspace
            </p>
            <p style={{ marginTop: 5, fontSize: 13, color: "var(--ds-muted)" }}>
              Create a new workspace or join one with an invite code.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStep("create_workspace")}
              className="onboarding-option"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="onboarding-option-icon">
                  <Plus size={16} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)" }}>Create a workspace</p>
                  <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>Start fresh with your own workspace</p>
                </div>
              </div>
              <ArrowRight size={15} style={{ color: "var(--ds-muted)", flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => setStep("join_workspace")}
              className="onboarding-option"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="onboarding-option-icon">
                  <MessageSquare size={16} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)" }}>Join with an invite code</p>
                  <p style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>Your team admin can share a code</p>
                </div>
              </div>
              <ArrowRight size={15} style={{ color: "var(--ds-muted)", flexShrink: 0 }} />
            </button>
          </div>

          <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{ background: "none", border: "none", color: "var(--ds-muted)", cursor: "pointer", fontSize: 13 }}
            >
              Skip for now →
            </button>
          </p>
        </div>
      </>
    );
  }

  // ── Step 2c: create workspace inline ─────────────────────────────────────────

  if (step === "create_workspace") {
    return (
      <>
        <StepIndicator current={2} total={2} />

        <div className="auth-card">
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--ds-border)" }}>
            <button
              type="button"
              onClick={() => { setCreateError(null); setStep("choose_path"); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ds-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}
            >
              <ArrowLeft size={13} />
              Back
            </button>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)" }}>
              Name your workspace
            </p>
            <p style={{ marginTop: 5, fontSize: 13, color: "var(--ds-muted)" }}>
              This is where your team will chat and collaborate.
            </p>
          </div>

          <form onSubmit={handleCreateWorkspace} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="workspaceName">Workspace name</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}>
                  <Hash size={14} color="var(--ds-muted)" />
                </span>
                <input
                  id="workspaceName"
                  type="text"
                  className="input"
                  placeholder="Acme Corp"
                  value={workspaceName}
                  onChange={(e) => { setWorkspaceName(e.target.value); setCreateError(null); }}
                  required
                  autoFocus
                  maxLength={50}
                  style={{ paddingLeft: 30 }}
                />
              </div>
            </div>

            {createError && (
              <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>{createError}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={isCreating || !workspaceName.trim()}
            >
              {isCreating ? (
                <><span className="spinner spinner-sm spinner-white" /> Creating…</>
              ) : (
                <>Create workspace <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>
      </>
    );
  }

  // ── Step 2j: join workspace inline ────────────────────────────────────────────

  return (
    <>
      <StepIndicator current={2} total={2} />

      <div className="auth-card">
        <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--ds-border)" }}>
          <button
            type="button"
            onClick={() => { setJoinError(null); setJoinCode(""); setStep("choose_path"); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ds-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-heading)" }}>
            Join a workspace
          </p>
          <p style={{ marginTop: 5, fontSize: 13, color: "var(--ds-muted)" }}>
            Enter the invite code shared by your workspace admin.
          </p>
        </div>

        <form onSubmit={handleJoinWorkspace} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="joinCode">Workspace code</label>
            <input
              id="joinCode"
              type="text"
              className="input"
              placeholder="abc12345"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.trim()); setJoinError(null); }}
              required
              autoFocus
              style={{ fontFamily: "monospace", letterSpacing: "0.1em", fontSize: 16, textAlign: "center" }}
            />
          </div>

          {joinError && (
            <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: 13 }}>{joinError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={isJoining || !joinCode.trim()}
          >
            {isJoining ? (
              <><span className="spinner spinner-sm spinner-white" /> Joining…</>
            ) : (
              <>Join workspace <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
