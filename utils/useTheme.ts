import { useEffect, useState } from "react";
import { Theme, THEME_CHANGE_EVENT, getCurrentTheme } from "./theme";

// Tracks the currently-applied theme, updating live if the user changes it
// (via the halifaq-theme-change event applyTheme() fires) without needing a
// page reload. Used by anything that needs to render differently per theme
// beyond what the CSS overrides in globals.css can do (e.g. swapping in a
// MikuChibi icon).
export function useTheme(): Theme {
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

  return theme;
}
