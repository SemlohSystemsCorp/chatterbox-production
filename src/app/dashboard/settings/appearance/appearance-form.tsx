"use client";

import { useState, useEffect } from "react";
import { updateAppearanceSettings } from "../../actions";
import { AlignJustify, Type, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppearanceFormProps {
  defaults: {
    messageDensity: string;
    fontSize: string;
  };
}

const DENSITY_OPTIONS = [
  { value: "compact", label: "Compact", description: "Less spacing between messages" },
  { value: "comfortable", label: "Comfortable", description: "Default spacing" },
];

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small", size: "text-xs" },
  { value: "medium", label: "Medium", size: "text-sm" },
  { value: "large", label: "Large", size: "text-base" },
];

export function AppearanceForm({ defaults }: AppearanceFormProps) {
  const [messageDensity, setMessageDensity] = useState(defaults.messageDensity);
  const [fontSize, setFontSize] = useState(defaults.fontSize);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cb_theme");
      if (saved === "dark") setTheme("dark");
    } catch {}
  }, []);

  function toggleTheme(next: "light" | "dark") {
    setTheme(next);
    try {
      if (next === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("cb_theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("cb_theme", "light");
      }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const formData = new FormData();
    formData.set("messageDensity", messageDensity);
    formData.set("fontSize", fontSize);

    const result = await updateAppearanceSettings(formData);

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
      {/* Theme */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="text-sm font-semibold text-foreground">Theme</h2>
        </div>
        <div className="flex gap-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTheme(t)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-5 py-3 text-xs font-medium transition-all",
                theme === t
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              )}
            >
              {/* Mini preview */}
              <div className={cn("flex h-10 w-14 flex-col overflow-hidden rounded border", t === "dark" ? "border-[#35383f] bg-[#1a1d21]" : "border-border bg-white")}>
                <div className={cn("flex items-center gap-1 px-1.5 py-1", t === "dark" ? "bg-[#222529]" : "bg-muted/60")}>
                  <div className={cn("h-1 w-1 rounded-full", t === "dark" ? "bg-[#7b73ff]" : "bg-primary")} />
                  <div className={cn("h-1 w-6 rounded", t === "dark" ? "bg-[#b5b9c4]/30" : "bg-foreground/15")} />
                </div>
                <div className="flex flex-1 items-end gap-1 px-1.5 pb-1">
                  <div className={cn("h-1 w-full rounded", t === "dark" ? "bg-[#b5b9c4]/20" : "bg-foreground/10")} />
                </div>
              </div>
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your theme preference is saved locally on this device.
        </p>
      </div>

      {/* Message density */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlignJustify className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Message density</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DENSITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col rounded-md border px-4 py-3 transition-all",
                messageDensity === option.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-accent/50"
              )}
            >
              <input
                type="radio"
                name="messageDensity"
                value={option.value}
                checked={messageDensity === option.value}
                onChange={() => setMessageDensity(option.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
              <div className={cn("mt-3 rounded border border-border bg-white p-2", option.value === "compact" ? "space-y-0" : "space-y-1.5")}>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-primary/20" />
                  <div className="h-2 w-16 rounded bg-foreground/15" />
                </div>
                <div className="ml-5.5 h-2 w-24 rounded bg-foreground/10" />
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-primary/20" />
                  <div className="h-2 w-12 rounded bg-foreground/15" />
                </div>
                <div className="ml-5.5 h-2 w-20 rounded bg-foreground/10" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Font size</h2>
        </div>
        <div className="flex gap-3">
          {FONT_SIZE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 transition-all",
                fontSize === option.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-accent/50"
              )}
            >
              <input
                type="radio"
                name="fontSize"
                value={option.value}
                checked={fontSize === option.value}
                onChange={() => setFontSize(option.value)}
                className="sr-only"
              />
              <span className={cn("font-medium text-foreground", option.size)}>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}
      {success && (
        <div className="alert alert-success">Appearance settings saved.</div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving && <span className="spinner spinner-sm spinner-white" />}
          Save preferences
        </button>
      </div>
    </form>
  );
}
