export type Theme = "dark" | "light" | "miku";
export const THEMES: Theme[] = ["dark", "light", "miku"];
export const THEME_STORAGE_KEY = "halifaq_theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as string[]).includes(value);
}

// Sets the <html data-theme="..."> attribute (globals.css does the actual
// re-coloring) and caches the choice so the next page load can apply it
// before Supabase even responds (see the inline script in app/layout.tsx).
export function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore — theme just won't persist locally this session
  }
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
