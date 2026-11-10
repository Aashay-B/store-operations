"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
        action?: string;
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileProps = {
  onToken: (token: string | null) => void;
  resetKey?: number;
};

export default function Turnstile({ onToken, resetKey = 0 }: TurnstileProps) {
  const containerId = useId().replace(/:/g, "");
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || !window.turnstile || widgetId.current) return;

    const element = document.getElementById(containerId);
    if (!element) return;

    widgetId.current = window.turnstile.render(element, {
      sitekey: siteKey,
      action: "store_operations_login",
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [containerId, onToken, scriptReady, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current) {
      onToken(null);
      window.turnstile?.reset(widgetId.current);
    }
  }, [onToken, resetKey]);

  if (!siteKey) {
    return <p className="login-error" role="alert">Login protection is not configured.</p>;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div id={containerId} />
    </>
  );
}
