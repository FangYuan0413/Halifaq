// Reusable HalifaQ wordmark: a glowing ring-and-tail "Q" mark with a tiny
// satellite dot slowly orbiting it, plus the wordmark, all breathing with a
// slow glow pulse. Used anywhere the brand name appears so it stays consistent.
export default function Logo({
  size = "text-3xl",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`animate-pulse-glow inline-flex items-center gap-2 text-white ${size} ${className}`}
    >
      <svg
        viewBox="0 0 44 44"
        className="h-[0.8em] w-[0.8em] shrink-0"
        fill="none"
      >
        <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="3" />
        <circle cx="29" cy="29" r="4" fill="currentColor" />
        <g className="animate-spin-slow" style={{ transformOrigin: "18px 18px" }}>
          <circle cx="18" cy="2.5" r="2.5" fill="currentColor" />
        </g>
      </svg>
      <span className="font-bold tracking-tight">HalifaQ</span>
    </span>
  );
}
