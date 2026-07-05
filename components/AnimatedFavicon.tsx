"use client";

import { useEffect } from "react";

// Browsers don't reliably support animated .ico/.gif favicons, so instead
// this draws a small rotating "radar" mark (cyan arc + pulsing dot) onto an
// offscreen canvas and swaps the tab's favicon to a fresh frame ~30x/second
// — a genuinely animated site icon that works everywhere.
//
// Performance notes (this used to stutter):
// - The glow "halo" is pre-rendered once into its own small canvas and just
//   redrawn each frame, instead of recomputing an expensive shadowBlur on
//   every frame.
// - The canvas is 32x32 (real favicon display size) instead of 64x64, which
//   roughly quarters the pixels toDataURL has to encode every frame.
// - Most browsers cache the favicon aggressively and ignore just mutating
//   an existing <link>'s href, so each frame still removes the old icon
//   link and inserts a brand-new one — that part is cheap on its own.
export default function AnimatedFavicon() {
  useEffect(() => {
    document
      .querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
      .forEach((el) => el.remove());

    const SIZE = 32;
    const CENTER = SIZE / 2;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pre-rendered soft glow, reused every frame (cheap to redraw an image;
    // expensive to recompute shadowBlur every frame).
    const glow = document.createElement("canvas");
    glow.width = SIZE;
    glow.height = SIZE;
    const glowCtx = glow.getContext("2d");
    if (glowCtx) {
      const gradient = glowCtx.createRadialGradient(
        CENTER,
        CENTER,
        2,
        CENTER,
        CENTER,
        CENTER
      );
      gradient.addColorStop(0, "rgba(103, 232, 249, 0.85)");
      gradient.addColorStop(1, "rgba(103, 232, 249, 0)");
      glowCtx.fillStyle = gradient;
      glowCtx.fillRect(0, 0, SIZE, SIZE);
    }

    const TOTAL_FRAMES = 60;
    let frame = 0;

    function draw() {
      if (!ctx) return;
      const angle = (frame / TOTAL_FRAMES) * Math.PI * 2;
      const pulse = 1.5 + Math.sin((frame / TOTAL_FRAMES) * Math.PI * 2) * 1.2;

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(glow, 0, 0);

      // Rotating arc ring (crisp stroke, no per-frame blur)
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 1.4);
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Pulsing center dot
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, pulse, 0, Math.PI * 2);
      ctx.fillStyle = "#e0fbff";
      ctx.fill();

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
    const id = setInterval(draw, 33); // ~30fps
    return () => clearInterval(id);
  }, []);

  return null;
}
