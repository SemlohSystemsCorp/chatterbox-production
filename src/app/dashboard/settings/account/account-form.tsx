"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateEmail, updatePassword, deleteAccount } from "../../actions";
import { Shield, Mail, Key, Trash2, ExternalLink } from "lucide-react";

interface AccountFormProps {
  email: string;
  hasPassword: boolean;
  connectedProviders: string[];
  createdAt: string;
}

export function AccountForm({ email, hasPassword, connectedProviders, createdAt }: AccountFormProps) {
  const [newEmail, setNewEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [emailResult, setEmailResult] = useState<{ error?: string; message?: string } | null>(null);
  const [passwordResult, setPasswordResult] = useState<{ error?: string; success?: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    setEmailResult(null);
    setIsSavingEmail(true);

    const formData = new FormData();
    formData.set("email", newEmail);
    const result = await updateEmail(formData);
    setEmailResult(result);
    setIsSavingEmail(false);
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPasswordResult(null);
    setIsSavingPassword(true);

    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);
    const result = await updatePassword(formData);
    setPasswordResult(result);

    if (result.success) {
      setPassword("");
      setConfirmPassword("");
    }

    setIsSavingPassword(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteError(null);
    setIsDeleting(true);

    const result = await deleteAccount();
    if (result?.error) {
      setDeleteError(result.error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <form onSubmit={handleEmailUpdate} className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Email address</h2>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" isLoading={isSavingEmail} disabled={newEmail === email}>
            Update
          </Button>
        </div>
        {emailResult?.error && (
          <p className="mt-2 text-xs text-destructive">{emailResult.error}</p>
        )}
        {emailResult?.message && (
          <p className="mt-2 text-xs text-success">{emailResult.message}</p>
        )}
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordUpdate} className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            {hasPassword ? "Change password" : "Set password"}
          </h2>
        </div>
        <div className="space-y-3">
          <Input
            id="password"
            type="password"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Enter password again"
            required
          />
          {passwordResult?.error && (
            <p className="text-xs text-destructive">{passwordResult.error}</p>
          )}
          {passwordResult?.success && (
            <p className="text-xs text-success">Password updated successfully.</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isSavingPassword}>
              Update password
            </Button>
          </div>
        </div>
      </form>

      {/* Connected accounts */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Connected accounts</h2>
        </div>
        <div className="space-y-2">
          {connectedProviders.length > 0 ? (
            connectedProviders.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between rounded-md border border-border px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize">{provider}</span>
                </div>
                <span className="text-xs text-success font-medium">Connected</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No connected accounts.</p>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Account info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account created</span>
            <span className="text-foreground">
              {new Date(createdAt).toLocaleDateString([], {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="text-foreground font-mono text-xs">{email}</span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </Button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-foreground font-medium">
              Type <span className="font-mono text-destructive">DELETE</span> to confirm:
            </p>
            <div className="flex items-end gap-3">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="flex h-9 w-48 rounded-md border border-destructive/50 bg-white px-3 py-1.5 text-sm text-foreground font-mono shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                isLoading={isDeleting}
                disabled={deleteConfirmText !== "DELETE"}
              >
                Permanently delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
