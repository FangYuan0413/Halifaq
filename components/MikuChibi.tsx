// A small hand-drawn chibi face (twin teal pigtails + pink hair ties),
// used to give the Miku theme its own decorative flair — floating in the
// background and as the Miku-theme loading spinner — instead of just
// recoloring the app's existing abstract shapes.
export default function MikuChibi({
  className = "",
  hairColor = "#39C5BB",
}: {
  className?: string;
  hairColor?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* twintails, drawn behind the head */}
      <path
        d="M22 38 C 2 55, -2 78, 14 96 C 16 78, 24 62, 32 50 Z"
        fill={hairColor}
      />
      <path
        d="M78 38 C 98 55, 102 78, 86 96 C 84 78, 76 62, 68 50 Z"
        fill={hairColor}
      />
      {/* hair ties */}
      <rect x="17" y="35" width="12" height="7" rx="3.5" fill="#ff8fc7" />
      <rect x="71" y="35" width="12" height="7" rx="3.5" fill="#ff8fc7" />
      {/* head */}
      <circle cx="50" cy="48" r="27" fill="#ffe7db" />
      {/* bangs */}
      <path
        d="M23 44 C 23 18, 77 18, 77 44 C 77 30, 62 24, 50 24 C 38 24, 23 30, 23 44 Z"
        fill={hairColor}
      />
      {/* eyes */}
      <ellipse cx="40" cy="50" rx="3.2" ry="4.2" fill="#20393a" />
      <ellipse cx="60" cy="50" rx="3.2" ry="4.2" fill="#20393a" />
      <circle cx="41.3" cy="47.5" r="1" fill="#fff" />
      <circle cx="61.3" cy="47.5" r="1" fill="#fff" />
      {/* blush */}
      <circle cx="34" cy="58" r="4" fill="#ffb3c6" opacity="0.55" />
      <circle cx="66" cy="58" r="4" fill="#ffb3c6" opacity="0.55" />
      {/* smile */}
      <path
        d="M45 60 Q50 64 55 60"
        stroke="#20393a"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
