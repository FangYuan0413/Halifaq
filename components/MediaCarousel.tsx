"use client";

import { useState, MouseEvent } from "react";

export type MediaItem = { url: string; media_type: string };

// Shows one photo/video at a time from a post. If there's more than one,
// left/right arrows (and a "2/5" counter) let viewers step through them.
// Safe to nest inside a <Link> — arrow clicks stop the click from bubbling
// up and navigating away.
export default function MediaCarousel({ media }: { media: MediaItem[] }) {
  const [index, setIndex] = useState(0);

  if (media.length === 0) return null;

  const safeIndex = Math.min(index, media.length - 1);
  const current = media[safeIndex];

  function go(e: MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + media.length) % media.length);
  }

  return (
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
          className="max-h-80 w-full rounded-lg object-cover"
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
  );
}
