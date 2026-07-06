import { Suspense } from "react";
import SearchResults from "./SearchResults";

// useSearchParams() (used in SearchResults) needs a Suspense boundary per
// Next.js's app-router rules, so this stays a plain server wrapper.
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
