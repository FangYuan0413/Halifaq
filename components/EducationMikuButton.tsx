"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "./ToastProvider";

// A one-off, Miku-theme-only reskin of the "Education" category link: a
// warm wooden bookshelf button (real transparent corners, no forced CSS
// shape) with a small chibi Miku sitting cross-legged and reading right on
// top of the shelf's top ledge, centered and above the button's z-index,
// a toast on click, and a quick squash-and-hop played on Miku herself for
// tap feedback. The centering (left: 50% + translateX) lives on a wrapper
// span so it doesn't fight with the bounce animation's own transform.
export default function EducationMikuButton({
  className = "",
}: {
  className?: string;
}) {
  const { showToast } = useToast();
  const [tapped, setTapped] = useState(false);

  return (
    <Link
      href="/category/education"
      onClick={() => {
        showToast("Off to Education~ 📚");
        setTapped(true);
      }}
      className={`group relative flex shrink-0 items-center justify-center transition hover:brightness-110 active:scale-95 ${className}`}
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
      <span
        style={{
          height: "71%",
          top: "-60%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
        className="pointer-events-none absolute z-20"
      >
        <img
          src="/miku-reading.png"
          alt=""
          onAnimationEnd={() => setTapped(false)}
          className={`h-full w-auto max-w-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition group-hover:-translate-y-1 ${
            tapped ? "animate-miku-tap" : ""
          }`}
        />
      </span>
    </Link>
  );
}
