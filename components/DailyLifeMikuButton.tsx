"use client";

import Link from "next/link";
import { useToast } from "./ToastProvider";

// A one-off, Miku-theme-only reskin of the "Daily Life" category link:
// the wave/beach button art in place of a plain pill, a small chibi Miku
// badge peeking from the top-right corner, and a toast on click.
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
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center shadow-[0_0_12px_rgba(57,197,187,0.35)] transition hover:brightness-110 ${className}`}
      style={{ backgroundImage: "url(/miku-daily-life-button.png)" }}
    >
      <span className="text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        Daily Life
      </span>
      <img
        src="/miku-coconut.png"
        alt=""
        className="pointer-events-none absolute -top-3 right-0 h-9 w-9 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] transition group-hover:-translate-y-0.5"
      />
    </Link>
  );
}
