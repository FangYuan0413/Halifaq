import { ReactNode } from "react";

// A post counts as "trending" once it's picked up enough real engagement.
export const TRENDING_VIEWS = 50;
export const TRENDING_LIKES = 5;

export type SearchablePost = { title: string; body: string };

// How well a post matches a search query: an exact phrase match in the
// title is the strongest signal, then a phrase match in the body, then
// individual word overlap (title words weighted higher than body words).
// Returns 0 for "no match at all" so callers can filter those out entirely.
export function keywordRelevanceScore(post: SearchablePost, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const title = post.title.toLowerCase();
  const body = post.body.toLowerCase();

  let score = 0;
  if (title.includes(q)) score += 10;
  if (body.includes(q)) score += 4;

  q.split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      if (title.includes(word)) score += 3;
      if (body.includes(word)) score += 1;
    });

  return score;
}

// Turns a timestamp into "just now" / "5m ago" / "3h ago" / "2d ago", falling
// back to a plain date once it's more than a week old.
export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Wraps every case-insensitive occurrence of `query` in `text` with a
// highlighted <mark>, so it's obvious why a post matched a search.
export function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerText.includes(lowerQuery)) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  let idx = lowerText.indexOf(lowerQuery, start);

  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(
      <mark key={idx} className="rounded bg-yellow-400/30 text-yellow-200">
        {text.slice(idx, idx + lowerQuery.length)}
      </mark>
    );
    start = idx + lowerQuery.length;
    idx = lowerText.indexOf(lowerQuery, start);
  }
  if (start < text.length) parts.push(text.slice(start));

  return parts;
}

export type ScoredPost = {
  created_at: string;
  views: number;
  commentCount: number;
  likedBy: string[];
};

// "Hot" ranking: engagement (views + weighted likes/comments) divided by a
// gravity term based on age, so fresh popular posts rise but old ones don't
// dominate forever (same shape as the classic Hacker News ranking formula).
export function hotScore(post: ScoredPost) {
  const ageHours = Math.max(
    0,
    (Date.now() - new Date(post.created_at).getTime()) / 3_600_000
  );
  const raw = post.views * 1 + post.likedBy.length * 5 + post.commentCount * 4;
  return raw / Math.pow(ageHours + 2, 1.3);
}

const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "just", "what", "about", "your",
  "there", "their", "would", "could", "should", "which", "where", "when",
  "then", "them", "were", "been", "into", "only", "also", "some", "more",
  "like", "does", "doesn", "here", "such", "than", "these", "those", "will",
  "your", "yours", "over", "under", "very", "much", "many", "make", "made",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

export type PreferenceProfile = {
  tagWeights: Map<number, number>;
  keywordWeights: Map<string, number>;
};

export type ProfileSourcePost = {
  title: string;
  body: string;
  tags: { id: number }[];
};

// Builds a lightweight preference profile from posts a user has engaged
// with (currently: liked posts) — which tags and which keywords keep
// showing up for them.
export function buildPreferenceProfile(
  engagedPosts: ProfileSourcePost[]
): PreferenceProfile {
  const tagWeights = new Map<number, number>();
  const keywordWeights = new Map<string, number>();

  engagedPosts.forEach((p) => {
    p.tags.forEach((t) => {
      tagWeights.set(t.id, (tagWeights.get(t.id) ?? 0) + 1);
    });
    tokenize(`${p.title} ${p.body}`).forEach((w) => {
      keywordWeights.set(w, (keywordWeights.get(w) ?? 0) + 1);
    });
  });

  return { tagWeights, keywordWeights };
}

// Scores a candidate post against a preference profile: tag matches count
// more than keyword matches (each keyword only counted once per post, so a
// single repeated word can't dominate).
export function forYouScore(
  post: ProfileSourcePost,
  profile: PreferenceProfile
) {
  let score = 0;

  post.tags.forEach((t) => {
    score += (profile.tagWeights.get(t.id) ?? 0) * 3;
  });

  const seen = new Set<string>();
  tokenize(`${post.title} ${post.body}`).forEach((w) => {
    if (seen.has(w)) return;
    seen.add(w);
    score += profile.keywordWeights.get(w) ?? 0;
  });

  return score;
}
