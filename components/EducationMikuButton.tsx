"use client";

import Link from "next/link";
import { useToast } from "./ToastProvider";

// A one-off, Miku-theme-only reskin of the "Education" category link: a
// warm wooden bookshelf button (real transparent corners, no forced CSS
// shape) with a small chibi Miku sitting cross-legged and reading right on
// top of the shelf's top ledge, centered and above the button's z-index,
// with a toast on click.
export default function EducationMikuButton({
  className = "",
}: {
  className?: string;
}) {
  const { showToast } = useToast();

  return (
    <Link
      href="/category/education"
      onClick={() => showToast("Off to Education~ 📚")}
      className={`group relative flex shrink-0 items-center justify-center transition hover:brightness-110 ${className}`}
      style={{ aspectRatio: "900 / 395" }}
    >
      <img
        src="/miku-education-button.png"
        alt=""
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_10px_rgba(217,119,6,0.3)]"
      />
      <span className="relative z-10 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        Education
      </span>
      <img
        src="/miku-reading.png"
        alt=""
        style={{
          height: "71%",
          top: "-60%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
        className="pointer-events-none absolute z-20 w-auto max-w-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition group-hover:-translate-y-1"
      />
    </Link>
  );
}
