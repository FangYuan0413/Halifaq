export type Theme = "dark" | "light" | "miku";
export const THEMES: Theme[] = ["dark", "light", "miku"];
export const THEME_STORAGE_KEY = "halifaq_theme";
export const THEME_CHANGE_EVENT = "halifaq-theme-change";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as string[]).includes(value);
}

// Sets the <html data-theme="..."> attribute (globals.css does the actual
// re-coloring), caches the choice so the next page load can apply it before
// Supabase even responds (see the inline script in app/layout.tsx), and
// broadcasts a DOM event so already-mounted components (the background
// decoration, the loading spinner) can swap their Miku-specific bits
// without needing a page reload.
export function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore — theme just won't persist locally this session
  }
}

// Reads the theme currently applied to <html>, falling back to "dark".
export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  return isTheme(attr) ? attr : "dark";
}

export function getCachedTheme(): Theme {
  try {
    const cached = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(cached)) return cached;
  } catch {
    // ignore
  }
  return "dark";
}
