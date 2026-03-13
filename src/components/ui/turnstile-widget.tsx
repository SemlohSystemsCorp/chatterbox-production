"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    function mount() {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) return; // already mounted
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey as string,
        theme,
        callback: onVerify,
        "expired-callback": onExpire,
        "error-callback": onError,
      });
    }

    if (window.turnstile) {
      mount();
    } else {
      window.onTurnstileLoad = mount;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onVerify, onExpire, onError]);

  // If site key not configured, render nothing (dev / test env)
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="lazyOnload"
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
