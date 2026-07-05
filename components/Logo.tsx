// The HalifaQ wordmark: your mom's real handwritten signature, split into
// two layers — "Halifax" in a dim off-white (public/signature-halifax.png)
// and "Q" glowing cyan (public/signature-q.png) — plus a quick light sweep
// that passes across the whole signature (masked to its shape via
// public/signature-mask.png) and finishes with a small cyan particle burst
// timed to land right on the Q. Used anywhere the brand name appears.
const SPARK_ANGLES = [0, 60, 120, 180, 240, 300];
const SPARK_DISTANCE_EM = 0.4;
// Position of the "Q" within the signature image, as a percentage of the
// logo's own box — used to place the particle burst.
const Q_POSITION = { left: "90%", top: "50%" };

export default function Logo({
  size = "text-3xl",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="HalifaQ"
      className={`relative inline-block aspect-[297/171] h-[2em] ${size} ${className}`}
    >
      {/* "Halifax" — dim, static */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/signature-halifax.png"
        alt=""
        className="absolute inset-0 h-full w-full object-contain opacity-90"
      />

      {/* "Q" — glowing cyan, breathing pulse */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/signature-q.png"
        alt=""
        className="animate-pulse-glow-cyan absolute inset-0 h-full w-full object-contain"
      />

      {/* Quick shimmer sweep, masked to the signature's own silhouette */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          maskImage: "url(/signature-mask.png)",
          WebkitMaskImage: "url(/signature-mask.png)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <div className="animate-shimmer-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent" />
      </div>

      {/* Cyan particle burst, timed to land on the Q as the sweep passes it */}
      <span
        className="pointer-events-none absolute"
        style={{ left: Q_POSITION.left, top: Q_POSITION.top }}
      >
        {SPARK_ANGLES.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = (Math.cos(rad) * SPARK_DISTANCE_EM).toFixed(3);
          const y = (Math.sin(rad) * SPARK_DISTANCE_EM).toFixed(3);
          return (
            <span
              key={angle}
              className="animate-spark-burst absolute h-[0.12em] w-[0.12em] rounded-full bg-cyan-300"
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
  );
}
