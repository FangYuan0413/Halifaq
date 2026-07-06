"use client";

import { useEffect, useState, MouseEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import { MediaItem } from "@/components/MediaCarousel";
import PostCard from "@/components/PostCard";
import { useToast } from "@/components/ToastProvider";
import { keywordRelevanceScore } from "@/utils/postDisplay";
import { loadSearchHistory, addSearchHistoryTerm } from "@/utils/searchHistory";
import Spinner from "@/components/Spinner";

type Tag = { id: number; name: string };

type Post = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  media: MediaItem[];
  views: number;
  commentCount: number;
  profiles: { username: string; avatar_url: string | null } | null;
  tags: Tag[];
  likedBy: string[];
};

// Shape Supabase returns for the nested joins
type RawPost = Omit<Post, "tags" | "likedBy" | "commentCount" | "media"> & {
  post_categories: { categories: Tag | null }[] | null;
  post_likes: { user_id: string }[] | null;
  comments: { count: number }[] | null;
  post_media: { url: string; media_type: string; position: number }[] | null;
};

// Dedicated results page for a committed search (Enter in the feed's search
// box, or clicking a search-history term). Ranks posts by how well the
// keyword(s) match (title/body overlap), then by views, then by likes — so
// the closest matches lead, with real engagement breaking ties.
export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, views, profiles!posts_author_id_fkey(username, avatar_url), post_categories(categories(id, name)), post_likes(user_id), comments(count), post_media(url, media_type, position)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadPosts (search) failed", error);
      return;
    }

    if (data) {
      const withTags = (data as unknown as RawPost[]).map((p) => ({
        ...p,
        tags: (p.post_categories ?? [])
          .map((pc) => pc.categories)
          .filter((c): c is Tag => c !== null),
        likedBy: (p.post_likes ?? []).map((l) => l.user_id),
        commentCount: p.comments?.[0]?.count ?? 0,
        media: (p.post_media ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((m) => ({ url: m.url, media_type: m.media_type })),
      }));
      setPosts(withTags);
    }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setLoadingAuth(false);
      setLoadingResults(true);
      await loadPosts();
      setLoadingResults(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the input in sync if the URL's ?q= changes (e.g. browser back/forward).
  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  function runSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    addSearchHistoryTerm(trimmed, loadSearchHistory());
    showToast(`Searching for "${trimmed}"…`);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") runSearch(inputValue);
  }

  async function toggleLike(e: MouseEvent, postId: string, liked: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedBy: liked
                ? p.likedBy.filter((id) => id !== userId)
                : [...p.likedBy, userId],
            }
          : p
      )
    );

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      showToast("Unliked");
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId });
      showToast("Liked!");
    }
  }

  async function handleDelete(e: MouseEvent, postId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Delete this post? This can't be undone.")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("Post deleted.");
    } else {
      showToast(`Couldn't delete post — ${error.message}`, "error");
    }
  }

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </main>
    );
  }

  const query = initialQuery.trim();
  const results = posts
    .map((post) => ({ post, score: keywordRelevanceScore(post, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.post.views !== a.post.views) return b.post.views - a.post.views;
      return b.post.likedBy.length - a.post.likedBy.length;
    })
    .map((r) => r.post);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8">
      <BackgroundShapes />

      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          href="/feed"
          className="mb-6 inline-block text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          &larr; Back to feed
        </Link>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search posts or people…"
          className="mb-6 w-full rounded-full border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
        />

        {query && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
            {loadingResults ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>Searching…</span>
              </>
            ) : (
              <p>
                {results.length > 0
                  ? `${results.length} ${results.length === 1 ? "result" : "results"} for "${query}", closest match first`
                  : `No related posts found for "${query}".`}
              </p>
            )}
          </div>
        )}

        {!loadingResults && query && results.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            Try a different keyword, or check the spelling — nothing in
            HalifaQ&apos;s posts matches this one yet.
          </p>
        )}

        {results.length > 0 && (
          <div className="columns-1 gap-4 sm:columns-2">
            {results.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                query={query}
                onToggleLike={toggleLike}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
