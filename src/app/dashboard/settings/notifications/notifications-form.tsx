"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateNotificationSettings } from "../../actions";
import { Bell, Mail, AtSign, MessageSquare, Newspaper, MessageCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

interface NotificationsFormProps {
  defaults: {
    emailMentions: boolean;
    emailDms: boolean;
    emailDigest: boolean;
    pushDms: boolean;
    pushMentions: boolean;
    pushThreads: boolean;
  };
}

export function NotificationsForm({ defaults }: NotificationsFormProps) {
  const [emailMentions, setEmailMentions] = useState(defaults.emailMentions);
  const [emailDms, setEmailDms] = useState(defaults.emailDms);
  const [emailDigest, setEmailDigest] = useState(defaults.emailDigest);
  const [pushDms, setPushDms] = useState(defaults.pushDms);
  const [pushMentions, setPushMentions] = useState(defaults.pushMentions);
  const [pushThreads, setPushThreads] = useState(defaults.pushThreads);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const push = usePushNotifications();

  async function handleEnablePush() {
    const ok = await push.subscribe();
    if (!ok && push.permission === "denied") {
      setError("Push notifications are blocked. Please enable them in your browser settings.");
    }
  }

  async function handleDisablePush() {
    await push.unsubscribe();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const formData = new FormData();
    if (emailMentions) formData.set("emailMentions", "on");
    if (emailDms) formData.set("emailDms", "on");
    if (emailDigest) formData.set("emailDigest", "on");
    if (pushDms) formData.set("pushDms", "on");
    if (pushMentions) formData.set("pushMentions", "on");
    if (pushThreads) formData.set("pushThreads", "on");

    const result = await updateNotificationSettings(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email notifications */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Email notifications</h2>
        </div>
        <div className="space-y-3">
          <Toggle
            icon={<AtSign className="h-4 w-4" />}
            label="Mentions"
            description="Get emailed when someone @mentions you"
            checked={emailMentions}
            onChange={setEmailMentions}
          />
          <Toggle
            icon={<MessageSquare className="h-4 w-4" />}
            label="Direct messages"
            description="Get emailed when you receive a new DM"
            checked={emailDms}
            onChange={setEmailDms}
          />
          <Toggle
            icon={<Newspaper className="h-4 w-4" />}
            label="Weekly digest"
            description="Receive a weekly summary of activity"
            checked={emailDigest}
            onChange={setEmailDigest}
          />
        </div>
      </div>

      {/* Push notifications */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Push notifications</h2>
          </div>
          {push.isSupported && !push.isLoading && (
            <button
              type="button"
              onClick={push.isSubscribed ? handleDisablePush : handleEnablePush}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              {push.isSubscribed ? "Disable on this device" : "Enable on this device"}
            </button>
          )}
        </div>

        {!push.isSupported && (
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported by this browser.
          </p>
        )}

        {push.isSupported && push.permission === "denied" && (
          <p className="text-sm text-destructive">
            Push notifications are blocked. Please enable them in your browser settings.
          </p>
        )}

        {push.isSupported && push.permission !== "denied" && (
          <>
            {!push.isSubscribed && (
              <p className="mb-3 text-xs text-muted-foreground">
                Enable push notifications on this device to configure delivery preferences.
              </p>
            )}
            <div className="space-y-3">
              <Toggle
                icon={<MessageSquare className="h-4 w-4" />}
                label="Direct messages"
                description="Get notified when you receive a new DM"
                checked={pushDms}
                onChange={setPushDms}
                disabled={!push.isSubscribed}
              />
              <Toggle
                icon={<AtSign className="h-4 w-4" />}
                label="Mentions"
                description="Get notified when someone @mentions you"
                checked={pushMentions}
                onChange={setPushMentions}
                disabled={!push.isSubscribed}
              />
              <Toggle
                icon={<MessageCircle className="h-4 w-4" />}
                label="Thread replies"
                description="Get notified when someone replies to your thread"
                checked={pushThreads}
                onChange={setPushThreads}
                disabled={!push.isSubscribed}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-success/20 bg-success/5 px-4 py-3">
          <p className="text-sm text-success">Notification preferences saved.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Save preferences
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn(
      "flex items-center justify-between rounded-md border border-border px-4 py-3 transition-colors",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent/50"
    )}>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  );
}
