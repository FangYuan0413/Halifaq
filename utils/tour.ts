// Tiny localStorage helper for the first-visit onboarding tour — same
// per-browser pattern as utils/theme.ts and utils/searchHistory.ts. Kept
// separate from any account data since "have you seen the tour" is a
// device-level preference, not something that needs to sync across devices.
const TOUR_STORAGE_KEY = "halifaq-tour-seen";

export function hasTourSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TOUR_STORAGE_KEY) === "1";
}

export function markTourSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
}

// Used by the "Retake tour" button — clears the seen flag AND reloads the
// step index by simply letting the caller re-mount/show the tour.
export function resetTourSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOUR_STORAGE_KEY);
}
