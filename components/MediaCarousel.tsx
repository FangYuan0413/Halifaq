"use client";

import { useEffect, useState, MouseEvent } from "react";

export type MediaItem = { url: string; media_type: string };

// Shows one photo/video at a time from a post. If there's more than one,
// left/right arrows (and a "2/5" counter) let viewers step through them.
// Safe to nest inside a <Link> — arrow clicks stop the click from bubbling
// up and navigating away. Clicking a photo opens it fullscreen (same arrow
// navigation, plus Esc/backdrop-click/× to close).
export default function MediaCarousel({ media }: { media: MediaItem[] }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;

    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + media.length) % media.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % media.length);
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, media.length]);

  if (media.length === 0) return null;

  const safeIndex = Math.min(index, media.length - 1);
  const current = media[safeIndex];

  function go(e: MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + media.length) % media.length);
  }

  function openFullscreen(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFullscreen(true);
  }

  function closeFullscreen(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFullscreen(false);
  }

  return (
    <>
      <div className="relative mt-2">
        {current.media_type === "video" ? (
          <video
            src={current.url}
            controls
            className="max-h-80 w-full rounded-lg bg-black"
          />
        ) : (
          <img
            src={current.url}
            alt=""
            onClick={openFullscreen}
            className="max-h-80 w-full cursor-zoom-in rounded-lg object-cover"
          />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white transition hover:bg-black/80"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white transition hover:bg-black/80"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {safeIndex + 1}/{media.length}
            </span>
          </>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeFullscreen}
        >
          <button
            type="button"
            onClick={closeFullscreen}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
          >
            ×
          </button>

          <img
            src={current.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => go(e, -1)}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => go(e, 1)}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                {safeIndex + 1}/{media.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
