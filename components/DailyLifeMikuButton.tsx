"use client";

import Link from "next/link";
import { useToast } from "./ToastProvider";

// A one-off, Miku-theme-only reskin of the "Daily Life" category link: the
// wave/beach button art shown at its own native proportions (no forced
// CSS shape — the image already has real transparent corners), with a
// small chibi Miku badge standing near the top-right corner (a higher
// z-index than the button, not clipped by it), and a toast on click.
export default function DailyLifeMikuButton({
  className = "",
}: {
  className?: string;
}) {
  const { showToast } = useToast();

  return (
    <Link
      href="/category/daily-life"
      onClick={() => showToast("Off to Daily Life~ 🌊")}
      className={`group relative flex shrink-0 items-center justify-center transition hover:brightness-110 ${className}`}
      style={{ aspectRatio: "480 / 202" }}
    >
      <img
        src="/miku-daily-life-button.png"
        alt=""
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_10px_rgba(57,197,187,0.35)]"
      />
      <span className="relative z-10 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        Daily Life
      </span>
      <img
        src="/miku-coconut.png"
        alt=""
        style={{ height: "75%", top: "-60%", right: "4%" }}
        className="pointer-events-none absolute z-20 w-auto max-w-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition group-hover:-translate-y-1"
      />
    </Link>
  );
}
