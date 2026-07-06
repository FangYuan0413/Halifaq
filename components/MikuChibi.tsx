// A small hand-drawn chibi face (big round eyes, eyebrows, headphone
// earcups, chunky teal twintails with pink accents), used to give the Miku
// theme its own decorative flair — floating in the background, as the
// Miku-theme loading spinner, and on a few buttons — instead of just
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
      <ellipse
        cx="14"
        cy="68"
        rx="15"
        ry="27"
        fill={hairColor}
        transform="rotate(-18 14 68)"
      />
      <ellipse
        cx="86"
        cy="68"
        rx="15"
        ry="27"
        fill={hairColor}
        transform="rotate(18 86 68)"
      />

      {/* headphone earcups */}
      <rect x="13" y="40" width="11" height="23" rx="5.5" fill="#3a3a3a" />
      <rect x="16.5" y="45" width="4" height="13" rx="2" fill="#ff8fc7" />
      <rect x="76" y="40" width="11" height="23" rx="5.5" fill="#3a3a3a" />
      <rect x="79.5" y="45" width="4" height="13" rx="2" fill="#ff8fc7" />

      {/* head */}
      <circle cx="50" cy="53" r="34" fill="#ffe9db" />

      {/* bangs */}
      <path
        d="M17 49 C17 12, 83 12, 83 49 C83 29, 67 20, 50 20 C33 20, 17 29, 17 49 Z"
        fill={hairColor}
      />

      {/* eyebrows */}
      <path
        d="M32 45 Q38 40 45 43"
        stroke="#1c3a3a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M55 43 Q62 40 68 45"
        stroke="#1c3a3a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* eyes */}
      <circle cx="39" cy="56" r="7.2" fill="#ffffff" />
      <circle cx="39" cy="57" r="5.6" fill={hairColor} />
      <circle cx="39" cy="57.5" r="2.6" fill="#16302f" />
      <circle cx="41.2" cy="54" r="1.7" fill="#ffffff" />

      <circle cx="61" cy="56" r="7.2" fill="#ffffff" />
      <circle cx="61" cy="57" r="5.6" fill={hairColor} />
      <circle cx="61" cy="57.5" r="2.6" fill="#16302f" />
      <circle cx="63.2" cy="54" r="1.7" fill="#ffffff" />

      {/* blush */}
      <ellipse cx="31" cy="67" rx="5.2" ry="3.2" fill="#ffb3c6" opacity="0.65" />
      <ellipse cx="69" cy="67" rx="5.2" ry="3.2" fill="#ffb3c6" opacity="0.65" />

      {/* mouth */}
      <path
        d="M46 71 Q50 74.5 54 71"
        stroke="#16302f"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
