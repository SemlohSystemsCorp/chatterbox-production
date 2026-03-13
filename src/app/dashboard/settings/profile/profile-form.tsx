"use client";

import { useState } from "react";
import { updateProfile, updateAvatarUrl } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  profile: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    email: string;
    statusMessage: string;
    statusEmoji: string;
  };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [statusMessage, setStatusMessage] = useState(profile.statusMessage);
  const [statusEmoji, setStatusEmoji] = useState(profile.statusEmoji);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const formData = new FormData();
    formData.set("displayName", displayName);
    formData.set("username", username);
    formData.set("statusMessage", statusMessage);
    formData.set("statusEmoji", statusEmoji);

    const result = await updateProfile(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be under 2MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;

    await updateAvatarUrl(url);
    setAvatarUrl(url);
    setIsUploading(false);
    router.refresh();
  }

  async function handleRemoveAvatar() {
    setIsUploading(true);
    await updateAvatarUrl(null);
    setAvatarUrl(null);
    setIsUploading(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Avatar */}
      <div className="card card-body">
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 16 }}>Avatar</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div className="avatar avatar-lg" style={{ borderRadius: "50%", fontSize: 22, flexShrink: 0 }}>
              {(displayName || profile.email)[0].toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ cursor: isUploading ? "not-allowed" : "pointer" }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
              <span className="btn btn-secondary btn-sm">
                {isUploading ? <><span className="spinner spinner-sm" /> Uploading…</> : "Upload photo"}
              </span>
            </label>
            {avatarUrl && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: "var(--ds-muted)" }}>JPG, PNG, or GIF. Max 2MB.</p>
      </div>

      {/* Profile details */}
      <form onSubmit={handleSubmit}>
        <div className="card card-body" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 16 }}>Details</p>

          <div className="field">
            <label className="label" htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="username">Username</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, color: "var(--ds-muted)", pointerEvents: "none",
              }}>@</span>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                style={{ paddingLeft: 26 }}
              />
            </div>
            <p className="field-hint">3–20 chars · letters, numbers, hyphens, underscores</p>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={profile.email}
              disabled
              style={{ opacity: 0.6 }}
            />
            <p className="field-hint">Change your email in Account settings.</p>
          </div>
        </div>

        {/* Status */}
        <div className="card card-body" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-heading)", marginBottom: 16 }}>Status</p>

          <div className="field">
            <label className="label" htmlFor="statusEmoji">Status emoji</label>
            <input
              id="statusEmoji"
              type="text"
              className="input"
              value={statusEmoji}
              onChange={(e) => setStatusEmoji(e.target.value)}
              placeholder="e.g. ☕"
            />
            <p className="field-hint">A short emoji to show next to your name.</p>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="statusMessage">Status message</label>
            <input
              id="statusMessage"
              type="text"
              className="input"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. In a meeting"
            />
            <p className="field-hint">Let your team know what you&apos;re up to.</p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>Profile updated successfully.</div>}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving && <span className="spinner spinner-sm spinner-white" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
