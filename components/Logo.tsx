// Reusable HalifaQ wordmark: a dynamic cyan "radar" mark (two counter-
// rotating arced rings + a pulsing center dot), "Halifa" set in a bold
// connected script font with a quick light shimmer sweeping through it
// every few seconds, and the "Q" picked out in glowing cyan with a small
// particle burst timed to land right on it as the shimmer passes. Used
// anywhere the brand name appears so it stays consistent.
const SPARK_ANGLES = [0, 60, 120, 180, 240, 300];
const SPARK_DISTANCE_EM = 0.35;

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
  );

  if (iconOnly) {
    return (
      <span
        className={`animate-pulse-glow inline-flex items-center ${size} ${className}`}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={`animate-pulse-glow inline-flex items-center gap-2 ${size} ${className}`}
    >
      {icon}

      <span className="font-[family-name:var(--font-logo)] text-[1.4em] font-bold leading-none">
        <span
          className="animate-text-shimmer bg-gradient-to-r from-gray-400 via-white to-gray-400 bg-clip-text text-transparent"
          style={{ backgroundSize: "250% 100%" }}
        >
          Halifa
        </span>
        <span className="relative text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.8)]">
          Q
          {/* Cyan particle burst, timed to land on the Q as the shimmer passes */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2"
            aria-hidden
          >
            {SPARK_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = (Math.cos(rad) * SPARK_DISTANCE_EM).toFixed(3);
              const y = (Math.sin(rad) * SPARK_DISTANCE_EM).toFixed(3);
              return (
                <span
                  key={angle}
                  className="animate-spark-burst absolute h-[0.1em] w-[0.1em] rounded-full bg-cyan-300"
                  style={
                    {
                      "--spark-x": `${x}em`,
                      "--spark-y": `${y}em`,
                      animationDelay: `${i * 0.02}s`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </span>
        </span>
      </span>
    </span>
  );
}
