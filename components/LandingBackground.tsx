export default function LandingBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Very soft ocean haze behind the hero — intentionally barely visible. */}
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(8,127,149,0.10)_0%,rgba(8,127,149,0.035)_38%,transparent_72%)] blur-3xl" />

      {/* Harbour-inspired ripple groups replace the old random geometric blobs. */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        className="absolute -left-24 top-8 h-72 w-72 text-[#087F95] opacity-[0.11] sm:-left-16 sm:h-80 sm:w-80"
      >
        <circle cx="120" cy="120" r="34" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="120" cy="120" r="64" stroke="currentColor" strokeWidth="1.25" opacity="0.72" />
        <circle cx="120" cy="120" r="94" stroke="currentColor" strokeWidth="1" opacity="0.44" />
      </svg>

      <svg
        viewBox="0 0 280 280"
        fill="none"
        className="absolute -right-28 bottom-4 h-80 w-80 text-[#087F95] opacity-[0.09] sm:-right-16 sm:bottom-8 sm:h-96 sm:w-96"
      >
        <circle cx="140" cy="140" r="42" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="140" cy="140" r="78" stroke="currentColor" strokeWidth="1.25" opacity="0.7" />
        <circle cx="140" cy="140" r="116" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* A faint horizon/water line gives the background some Halifax-harbour character. */}
      <svg
        viewBox="0 0 900 120"
        preserveAspectRatio="none"
        fill="none"
        className="absolute bottom-[14%] left-1/2 h-20 w-[120%] -translate-x-1/2 text-[#087F95] opacity-[0.055]"
      >
        <path
          d="M0 60 C110 35 190 85 300 60 C410 35 490 85 600 60 C710 35 790 85 900 60"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0 78 C110 53 190 103 300 78 C410 53 490 103 600 78 C710 53 790 103 900 78"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity="0.65"
        />
      </svg>
    </div>
  );
}
