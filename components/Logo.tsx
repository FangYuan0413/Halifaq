// Reusable HalifaQ wordmark: a glowing cyan ring-and-tail "Q" mark with a
// tiny satellite dot slowly orbiting it, a white-to-gray gradient on
// "Halifa" set in a light, connected script font, and the "Q" picked out in
// the same cyan accent so the pun reads clearly. Everything breathes with a
// slow glow pulse. Used anywhere the brand name appears so it stays
// consistent.
export default function Logo({
  size = "text-3xl",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`animate-pulse-glow inline-flex items-center gap-2 ${size} ${className}`}
    >
      <svg
        viewBox="0 0 44 44"
        className="h-[0.8em] w-[0.8em] shrink-0 text-cyan-300"
        fill="none"
      >
        <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="3" />
        <circle cx="29" cy="29" r="4" fill="currentColor" />
        <g
          className="animate-spin-slow"
          style={{ transformOrigin: "18px 18px" }}
        >
          <circle cx="18" cy="2.5" r="2.5" fill="currentColor" />
        </g>
      </svg>
      <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text font-[family-name:var(--font-logo)] text-[1.4em] font-normal leading-none text-transparent">
        Halifa
        <span className="text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.8)]">
          Q
        </span>
      </span>
    </span>
  );
}
