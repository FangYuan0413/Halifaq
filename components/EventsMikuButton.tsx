"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "./ToastProvider";

// A one-off, Miku-theme-only reskin of the "Events" category link: a cork
// bulletin-board button (real transparent corners, no forced CSS shape)
// with a small chibi Miku peeking curiously over its top edge, a question
// mark beside her, a toast on click, and the same squash-and-hop tap
// feedback as the other Miku category buttons. The source art
// (public/miku-peeking.png) is used completely unmodified — it has its own
// built-in alignment guide (a thin dark bar under her hands, at ~75% of
// the image's height) that isn't visible once positioned correctly, since
// it lands exactly on the button's own top edge rather than floating above
// it. The height/top values below were tuned against that guide.
export default function EventsMikuButton({
  className = "",
}: {
  className?: string;
}) {
  const { showToast } = useToast();
  const [tapped, setTapped] = useState(false);

  return (
    <Link
      href="/category/events"
      onClick={() => {
        showToast("Off to Events~ 📌");
        setTapped(true);
      }}
      className={`group relative flex shrink-0 items-center justify-center transition hover:brightness-110 active:scale-95 ${className}`}
      style={{ aspectRatio: "900 / 353" }}
    >
      <img
        src="/miku-events-button.png"
        alt=""
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_10px_rgba(217,119,6,0.3)]"
      />
      <span className="relative z-10 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        Events
      </span>
      <span
        style={{
          height: "55%",
          top: "-41.3%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
        className="pointer-events-none absolute z-20"
      >
        <img
          src="/miku-peeking.png"
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
