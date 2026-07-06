"use client";

import {
  useEffect,
  useRef,
  useState,
  MouseEvent,
  WheelEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

export type MediaItem = { url: string; media_type: string };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Shows one photo/video at a time from a post. If there's more than one,
// left/right arrows (and a "2/5" counter) let viewers step through them.
// Safe to nest inside a <Link> — arrow clicks stop the click from bubbling
// up and navigating away. Clicking a photo opens it fullscreen (same arrow
// navigation, plus Esc/backdrop-click/× to close). While fullscreen, photos
// can be zoomed via scroll wheel, double-click, or a two-finger pinch, and
// panned by dragging once zoomed in.
export default function MediaCarousel({ media }: { media: MediaItem[] }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDist = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );

  useEffect(() => {
    // Reset zoom/pan whenever the visible photo changes or fullscreen toggles.
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [index, fullscreen]);

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

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => {
      const next = clampZoom(z - e.deltaY * 0.0015 * z);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleDoubleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => {
      if (z > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  }

  function setZoomClamped(next: number) {
    const z = clampZoom(next);
    setZoom(z);
    if (z === MIN_ZOOM) setPan({ x: 0, y: 0 });
  }

  function adjustZoom(delta: number) {
    setZoomClamped(zoom + delta);
  }

  function handlePointerDown(e: ReactPointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      lastPinchDist.current = dist(a, b);
      dragStart.current = null;
    } else if (pointers.current.size === 1 && zoom > 1) {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && lastPinchDist.current !== null) {
      const [a, b] = Array.from(pointers.current.values());
      const d = dist(a, b);
      const ratio = d / lastPinchDist.current;
      lastPinchDist.current = d;
      setZoom((z) => clampZoom(z * ratio));
    } else if (pointers.current.size === 1 && dragStart.current && zoom > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }
  }

  function handlePointerUp(e: ReactPointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 p-4"
          onClick={closeFullscreen}
          onWheel={current.media_type === "video" ? undefined : handleWheel}
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
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragStart.current ? "none" : "transform 0.12s ease-out",
              touchAction: "none",
            }}
            className={`max-h-[90vh] max-w-[90vw] select-none rounded-lg object-contain ${
              zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            }`}
          />

          {/* Zoom control — buttons + slider + live percentage */}
          <div
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => adjustZoom(-0.25)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="flex h-6 w-6 items-center justify-center rounded-full text-base leading-none transition hover:bg-white/20 disabled:opacity-30"
            >
              −
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoomClamped(parseFloat(e.target.value))}
              aria-label="Zoom level"
              className="w-24 accent-white sm:w-32"
            />
            <button
              type="button"
              onClick={() => adjustZoom(0.25)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="flex h-6 w-6 items-center justify-center rounded-full text-base leading-none transition hover:bg-white/20 disabled:opacity-30"
            >
              +
            </button>
            <span className="w-11 text-center text-xs tabular-nums text-gray-200">
              {Math.round(zoom * 100)}%
            </span>
          </div>

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
