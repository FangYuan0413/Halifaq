// A small spinning-ring loading indicator, used anywhere a plain "Loading…"
// line isn't enough feedback (e.g. the search results page while it fetches).
export default function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${className}`}
    />
  );
}
