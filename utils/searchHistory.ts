// Shared localStorage-backed search history, used by both the feed's search
// dropdown and the dedicated /search results page so the two stay in sync.

export const SEARCH_HISTORY_KEY = "halifaq_search_history";
export const SEARCH_HISTORY_VISIBLE_COUNT = 10;
const SEARCH_HISTORY_MAX_STORED = 30;

export function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // localStorage unavailable (private browsing, etc.)
    return [];
  }
}

function persist(list: string[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list));
  } catch {
    // ignore — history just won't persist this session
  }
}

// Adds `term` to the front of `current` (de-duped, capped), saves it, and
// returns the new list so the caller can update its own state with it.
export function addSearchHistoryTerm(term: string, current: string[]): string[] {
  const trimmed = term.trim();
  if (!trimmed) return current;
  const next = [trimmed, ...current.filter((h) => h !== trimmed)].slice(
    0,
    SEARCH_HISTORY_MAX_STORED
  );
  persist(next);
  return next;
}

export function removeSearchHistoryTerm(term: string, current: string[]): string[] {
  const next = current.filter((h) => h !== term);
  persist(next);
  return next;
}

export function clearSearchHistory(): string[] {
  persist([]);
  return [];
}
