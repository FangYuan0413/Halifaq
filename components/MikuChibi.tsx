// A small chibi Miku face — redesigned after the reference art in the
// project folder (miku 1.jpg–miku 7.jpg): bold dark outlines on every
// shape, glossy almond eyes with a big highlight + a small sparkle, a
// tapered flowing ponytail shape instead of a plain blob, a little cowlick,
// and hair ties sitting right where the ponytails leave the head. Used for
// the Miku theme's background decoration, its loading spinner, and the
// feed's "new post" button.
export default function MikuChibi({
  className = "",
  hairColor = "#39C5BB",
}: {
  className?: string;
  hairColor?: string;
}) {
  const ink = "#14312e";

  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* twintails — tapered, flowing shape instead of a plain blob */}
      <path
        d="M12 45 C -5 60, -8 85, 10 98 C 14 82, 20 65, 30 50 C 24 46, 17 44, 12 45 Z"
        fill={hairColor}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M88 45 C 105 60, 108 85, 90 98 C 86 82, 80 65, 70 50 C 76 46, 83 44, 88 45 Z"
        fill={hairColor}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* hair ties, right where each ponytail leaves the head */}
      <rect x="14" y="42" width="12" height="8" rx="4" fill="#ff5fa8" stroke={ink} strokeWidth="1.5" />
      <rect x="74" y="42" width="12" height="8" rx="4" fill="#ff5fa8" stroke={ink} strokeWidth="1.5" />

      {/* head */}
      <circle cx="50" cy="54" r="33" fill="#ffeee2" stroke={ink} strokeWidth="2" />

      {/* bangs, with a couple of thin strand lines for texture */}
      <path
        d="M18 50 C18 14, 82 14, 82 50 C82 31, 66 22, 50 22 C34 22, 18 31, 18 50 Z"
        fill={hairColor}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M38 24 L34 38" stroke={ink} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M62 24 L66 38" stroke={ink} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

      {/* little cowlick */}
      <path
        d="M48 21 Q45 8 56 11 Q50 15 48 21 Z"
        fill={hairColor}
        stroke={ink}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* eyes — almond shape, glossy highlight + small sparkle */}
      <path
        d="M31 55 Q31 46 40 46 Q49 46 49 56 Q49 65 40 65 Q31 65 31 55 Z"
        fill="#ffffff"
        stroke={ink}
        strokeWidth="2"
      />
      <path d="M33 57 Q33 50 40 50 Q46 50 46 57 Q46 63 40 63 Q33 63 33 57 Z" fill={hairColor} />
      <circle cx="40" cy="58" r="3.4" fill={ink} />
      <ellipse cx="36.5" cy="52.5" rx="2.6" ry="3.4" fill="#ffffff" />
      <circle cx="43" cy="60.5" r="1.3" fill="#ffffff" />

      <path
        d="M51 56 Q51 46 60 46 Q69 46 69 55 Q69 65 60 65 Q51 65 51 56 Z"
        fill="#ffffff"
        stroke={ink}
        strokeWidth="2"
      />
      <path d="M54 57 Q54 50 60 50 Q67 50 67 57 Q67 63 60 63 Q54 63 54 57 Z" fill={hairColor} />
      <circle cx="60" cy="58" r="3.4" fill={ink} />
      <ellipse cx="56.5" cy="52.5" rx="2.6" ry="3.4" fill="#ffffff" />
      <circle cx="63" cy="60.5" r="1.3" fill="#ffffff" />

      {/* blush */}
      <ellipse cx="29" cy="68" rx="5" ry="3" fill="#ffb3c6" opacity="0.65" />
      <ellipse cx="71" cy="68" rx="5" ry="3" fill="#ffb3c6" opacity="0.65" />

      {/* mouth */}
      <path
        d="M46 73 Q50 76.5 54 73"
        stroke={ink}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
