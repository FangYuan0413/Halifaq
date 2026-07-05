// Reusable HalifaQ wordmark: a dynamic cyan "radar" mark — two counter-
// rotating arced rings with a pulsing center dot — plus "Halifa" in a
// white-to-gray gradient set in a bold, connected script font, with the "Q"
// picked out in the same cyan accent so the pun reads clearly. Everything
// breathes with a slow glow pulse. Used anywhere the brand name appears so
// it stays consistent.
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
        className="h-[0.85em] w-[0.85em] shrink-0 text-cyan-300"
        fill="none"
      >
        <circle
          cx="22"
          cy="22"
          r="17"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="80 30"
          opacity="0.9"
          className="animate-spin-slow"
          style={{ transformOrigin: "22px 22px" }}
        />
        <circle
          cx="22"
          cy="22"
          r="11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="45 25"
          opacity="0.9"
          className="animate-spin-reverse-slow"
          style={{ transformOrigin: "22px 22px" }}
        />
        <circle
          cx="22"
          cy="22"
          r="3.5"
          fill="currentColor"
          className="animate-pulse-scale"
          style={{ transformOrigin: "22px 22px" }}
        />
      </svg>
      <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text font-[family-name:var(--font-logo)] text-[1.4em] font-bold leading-none text-transparent">
        Halifa
        <span className="text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.8)]">
          Q
        </span>
      </span>
    </span>
  );
}
