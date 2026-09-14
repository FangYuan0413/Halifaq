"use client";

import { useEffect, useState } from "react";
import { Theme, THEME_CHANGE_EVENT, getCurrentTheme } from "@/utils/theme";

function Base64Panel({
  source,
  className = "",
  alt = "",
}: {
  source: string;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(source)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("asset load failed"))))
      .then((base64) => {
        if (!cancelled) setSrc(`data:image/webp;base64,${base64.trim()}`);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!src) return <div className={className} aria-hidden="true" />;
  return <img src={src} alt={alt} className={className} draggable={false} />;
}

function MikuReferenceShell() {
  const openComposer = () => {
    document
      .querySelector<HTMLButtonElement>('[data-tour="new-post"]')
      ?.click();
  };

  const rightCategories = [
    ["/category/visa-immigration", "Visa & Immigration"],
    ["/category/housing", "Housing"],
    ["/category/education", "Education"],
    ["/category/jobs-work", "Jobs & Work"],
    ["/category/daily-life", "Daily Life"],
    ["/category/food", "Food"],
    ["/category/transportation", "Transportation"],
    ["/category/events", "Events"],
    ["/category/gaming", "Gaming"],
    ["/feed", "All Categories"],
  ] as const;

  return (
    <div className="miku-reference-shell" aria-hidden="false">
      <aside className="miku-reference-left" aria-label="Miku navigation artwork">
        <Base64Panel
          source="/miku-theme/reference-left-top.b64.txt"
          className="miku-reference-left-top"
        />
        <Base64Panel
          source="/miku-theme/reference-left-lower.b64.txt"
          className="miku-reference-left-lower"
        />
        <nav className="miku-reference-left-links" aria-label="Main navigation">
          <a href="/feed" style={{ top: "16.5%" }} aria-label="Home" />
          <a href="/search" style={{ top: "24.0%" }} aria-label="Explore" />
          <a href="#miku-popular-categories" style={{ top: "31.5%" }} aria-label="Categories" />
          <a href="/messages" style={{ top: "47.0%" }} aria-label="Messages" />
          <a href="/messages" style={{ top: "55.0%" }} aria-label="Bookmarks" />
        </nav>
      </aside>

      <Base64Panel
        source="/miku-theme/reference-hero.b64.txt"
        className="miku-reference-hero"
        alt="Hatsune Miku and Halifax harbour"
      />

      <button
        type="button"
        onClick={openComposer}
        className="miku-reference-composer"
        aria-label="Create a new post"
      >
        <span className="miku-reference-composer-avatar">♪</span>
        <span className="miku-reference-composer-placeholder">
          What would you like to ask or share?
        </span>
        <span className="miku-reference-composer-tools">Text　Photo　Link　Poll</span>
        <span className="miku-reference-composer-post">Post</span>
      </button>

      <aside className="miku-reference-right" aria-label="Miku community sidebar">
        <Base64Panel
          source="/miku-theme/reference-right-top.b64.txt"
          className="miku-reference-right-top"
        />
        <div id="miku-popular-categories" className="miku-reference-categories-wrap">
          <Base64Panel
            source="/miku-theme/reference-right-categories.b64.txt"
            className="miku-reference-right-categories"
          />
          <nav className="miku-reference-category-links" aria-label="Popular categories">
            {rightCategories.map(([href, label], i) => (
              <a
                key={`${href}-${i}`}
                href={href}
                aria-label={label}
                style={{ top: `${52 + i * 47}px` }}
              />
            ))}
          </nav>
        </div>
        <Base64Panel
          source="/miku-theme/reference-right-quote.b64.txt"
          className="miku-reference-right-quote"
        />
      </aside>
    </div>
  );
}

// Shared decorative background. The regular themes use abstract floating
// shapes. Miku uses the approved Halifax × Miku dashboard artwork as a fixed
// layout shell, while the real feed remains live and interactive on top.
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

  if (theme === "miku") return <MikuReferenceShell />;

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
