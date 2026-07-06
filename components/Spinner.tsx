"use client";

import { useEffect, useState } from "react";
import MikuChibi from "./MikuChibi";
import { Theme, THEME_CHANGE_EVENT, getCurrentTheme } from "@/utils/theme";

// A small loading indicator, used anywhere a plain "Loading…" line isn't
// enough feedback (e.g. the search results page while it fetches). On the
// Miku theme this spins a tiny chibi face instead of a plain ring.
export default function Spinner({ className = "h-5 w-5" }: { className?: string }) {
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
      <MikuChibi
        className={`animate-spin-slow ${className}`}
        hairColor="#39C5BB"
      />
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${className}`}
    />
  );
}
