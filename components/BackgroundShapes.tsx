"use client";

import { useEffect, useState } from "react";
import { Theme, THEME_CHANGE_EVENT, getCurrentTheme } from "@/utils/theme";

// Shared decorative background. The regular themes use abstract floating
// shapes. On the feed, Miku uses the approved three-column reference shell.
// Other Miku pages keep a quiet aqua background without the dashboard chrome.
export default function BackgroundShapes() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());

    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail) setTheme(detail);
    }

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  if (theme === "miku") {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(103,211,226,0.12),transparent_28rem),radial-gradient(circle_at_85%_80%,rgba(57,197,187,0.09),transparent_30rem)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="bg-shape animate-float-1 absolute -left-16 top-8 h-40 w-40 opacity-20 blur-sm"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="40" fill="white" />
      </svg>

      <svg
        className="bg-shape animate-float-2 absolute right-10 top-1/4 h-32 w-32 opacity-20 blur-sm"
        viewBox="0 0 100 100"
      >
        <rect
          x="20"
          y="20"
          width="60"
          height="60"
          fill="white"
          transform="rotate(45 50 50)"
        />
      </svg>

      <svg
        className="bg-shape animate-float-3 absolute left-1/4 bottom-20 h-36 w-36 opacity-15 blur-sm"
        viewBox="0 0 100 100"
      >
        <polygon points="50,10 90,90 10,90" fill="white" />
      </svg>

      <svg
        className="bg-shape animate-float-4 absolute right-1/4 bottom-1/3 h-28 w-28 opacity-20 blur-sm"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="35" fill="white" />
      </svg>

      <svg
        className="bg-shape animate-float-5 absolute -right-12 -top-8 h-44 w-44 opacity-10 blur-md"
        viewBox="0 0 100 100"
      >
        <rect x="15" y="15" width="70" height="70" fill="white" />
      </svg>
    </div>
  );
}
