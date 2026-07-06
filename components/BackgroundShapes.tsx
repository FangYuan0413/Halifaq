"use client";

import { useEffect, useState } from "react";
import MikuChibi from "./MikuChibi";
import { Theme, THEME_CHANGE_EVENT, getCurrentTheme } from "@/utils/theme";

// Shared decorative background. On the Dark/Light themes: soft glowing
// triangles, squares, and circles drifting slowly. On the Miku theme: a few
// chibi Mikus flying past instead, since a plain recolor of abstract shapes
// doesn't really read as "Miku" the way an actual little face does.
// Drop this as the first child inside a `relative overflow-hidden` wrapper,
// and give your real content `relative z-10` so it stays above these shapes.
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <MikuChibi className="animate-fly-1 absolute -left-16 top-12 h-20 w-20 opacity-70" />
        <MikuChibi
          className="animate-fly-2 absolute -right-14 top-1/3 h-16 w-16 opacity-60"
          hairColor="#2fb0a7"
        />
        <MikuChibi className="animate-fly-3 absolute -left-10 bottom-24 h-14 w-14 opacity-50" />
        <MikuChibi
          className="animate-fly-4 absolute -right-12 bottom-10 h-24 w-24 opacity-40"
          hairColor="#57d6cc"
        />
      </div>
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
        <rect x="20" y="20" width="60" height="60" fill="white" transform="rotate(45 50 50)" />
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
