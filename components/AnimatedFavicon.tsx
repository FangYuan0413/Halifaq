"use client";

import { useEffect } from "react";

// Browsers don't reliably support animated .ico/.gif favicons, so instead
// this draws a small breathing cyan glow orb onto an offscreen canvas and
// swaps the tab's favicon to a fresh frame ~50x/second — a genuinely
// animated site icon that works everywhere.
//
// A real favicon only renders at ~16px, so fine detail (like a thin rotating
// arc) just turns into a blur at that size — it read as a shapeless blob
// instead of a crisp mark. This version leans into that instead of fighting
// it: a single soft glow that smoothly grows and shrinks, plus a small
// bright core, which is both simpler to render (cheaper, so a higher frame
// rate is easy) and reads cleanly even at tiny sizes.
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

    // Pre-rendered soft glow, reused every frame (redrawing/scaling an
    // image is far cheaper than recomputing a gradient or blur each frame).
    const glow = document.createElement("canvas");
    glow.width = SIZE;
    glow.height = SIZE;
    const glowCtx = glow.getContext("2d");
    if (glowCtx) {
      const gradient = glowCtx.createRadialGradient(
        CENTER,
        CENTER,
        1,
        CENTER,
        CENTER,
        CENTER
      );
      gradient.addColorStop(0, "rgba(160, 245, 255, 0.95)");
      gradient.addColorStop(0.5, "rgba(103, 232, 249, 0.55)");
      gradient.addColorStop(1, "rgba(103, 232, 249, 0)");
      glowCtx.fillStyle = gradient;
      glowCtx.fillRect(0, 0, SIZE, SIZE);
    }

    const TOTAL_FRAMES = 90;
    let frame = 0;

    function draw() {
      if (!ctx) return;
      const t = (frame / TOTAL_FRAMES) * Math.PI * 2;
      const scale = 0.75 + (Math.sin(t) + 1) * 0.125; // breathes between 0.75x and 1.0x

      const glowSize = SIZE * scale;
      const offset = (SIZE - glowSize) / 2;

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(glow, offset, offset, glowSize, glowSize);

      // Small bright core so it still has a defined center at any size.
      const coreRadius = 1.8 + (Math.sin(t) + 1) * 0.6;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
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
    const id = setInterval(draw, 20); // ~50fps — cheap now that each frame is just a scaled image + a small fill
    return () => clearInterval(id);
  }, []);

  return null;
}
