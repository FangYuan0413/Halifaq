"use client";

import { useEffect } from "react";

// Browsers don't reliably support animated .ico/.gif favicons, so instead
// this draws a small rotating "radar" mark (cyan arc + pulsing dot) onto an
// offscreen canvas and swaps the tab's favicon to a fresh frame a few times
// a second — a genuinely animated site icon that works everywhere.
//
// Important: most browsers cache the favicon aggressively and ignore just
// mutating an existing <link>'s href, so each frame removes any old icon
// links and inserts a brand-new <link> element instead.
export default function AnimatedFavicon() {
  useEffect(() => {
    // Get rid of any default favicon link Next.js may have added, so ours
    // isn't competing with (or losing to) it.
    document
      .querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
      .forEach((el) => el.remove());

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TOTAL_FRAMES = 36;
    let frame = 0;

    function draw() {
      if (!ctx) return;
      const angle = (frame / TOTAL_FRAMES) * Math.PI * 2;
      const pulse = 3 + Math.sin((frame / TOTAL_FRAMES) * Math.PI * 2) * 2.5;

      ctx.clearRect(0, 0, 64, 64);

      // Rotating arc ring
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 1.4);
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.shadowColor = "#67e8f9";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Pulsing center dot
      ctx.beginPath();
      ctx.arc(32, 32, pulse, 0, Math.PI * 2);
      ctx.fillStyle = "#67e8f9";
      ctx.shadowColor = "#67e8f9";
      ctx.shadowBlur = 8;
      ctx.fill();

      // Recreate the link every frame — mutating .href on the same element
      // gets ignored by several browsers once a favicon is cached.
      document
        .querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
        .forEach((el) => el.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = canvas.toDataURL("image/png");
      document.head.appendChild(link);

      frame = (frame + 1) % TOTAL_FRAMES;
    }

    draw();
    const id = setInterval(draw, 90);
    return () => clearInterval(id);
  }, []);

  return null;
}
