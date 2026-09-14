// Reusable HalifaQ wordmark. The ocean-teal accent is shared by the ripple
// mark and the Q so the brand reads as one system instead of several neon
// effects competing with each other.
export default function Logo({
  size = "text-3xl",
  className = "",
  iconOnly = false,
}: {
  size?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const icon = (
    <svg
      viewBox="0 0 44 44"
      className="h-[0.85em] w-[0.85em] shrink-0 text-[#087F95]"
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
        opacity="0.82"
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
  );

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center ${size} ${className}`}>
        {icon}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${size} ${className}`}>
      {icon}

      <span className="font-[family-name:var(--font-logo)] text-[1.4em] font-bold leading-none">
        <span className="text-white">Halifa</span>
        <span className="relative text-[#087F95] drop-shadow-[0_0_8px_rgba(8,127,149,0.18)]">
          Q
        </span>
      </span>
    </span>
  );
}
