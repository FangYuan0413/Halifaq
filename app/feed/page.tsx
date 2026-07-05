"use client";

import {
  useEffect,
  useRef,
  useState,
  FormEvent,
  ChangeEvent,
  MouseEvent,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import Logo from "@/components/Logo";

type Category = { id: number; name: string; slug: string };
type Tag = { id: number; name: string };
type UserResult = { id: string; username: string };

// Wraps every case-insensitive occurrence of `query` in `text` with a
// highlighted <mark>, so it's obvious why a post matched a search.
function highlightMatch(text: string, query: string) {
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

// Turns a timestamp into "just now" / "5m ago" / "3h ago" / "2d ago", falling
// back to a plain date once it's more than a week old.
function formatRelativeTime(dateString: string) {
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

type Post = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  media_url: string | null;
  media_type: string | null;
  views: number;
  commentCount: number;
  profiles: { username: string; avatar_url: string | null } | null;
  tags: Tag[];
  likedBy: string[];
};

// Shape Supabase returns for the nested join: post_categories -> categories
type RawPost = Omit<Post, "tags" | "likedBy" | "commentCount"> & {
  post_categories: { categories: Tag | null }[] | null;
  post_likes: { user_id: string }[] | null;
  comments: { count: number }[] | null;
};

// A post counts as "trending" once it's picked up enough real engagement.
const TRENDING_VIEWS = 50;
const TRENDING_LIKES = 5;

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedTab, setFeedTab] = useState<"all" | "following">("all");
  const [filterCategoryIds, setFilterCategoryIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, media_url, media_type, views, profiles!posts_author_id_fkey(username, avatar_url), post_categories(categories(id, name)), post_likes(user_id), comments(count)"
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      const withTags = (data as unknown as RawPost[]).map((p) => ({
        ...p,
        tags: (p.post_categories ?? [])
          .map((pc) => pc.categories)
          .filter((c): c is Tag => c !== null),
        likedBy: (p.post_likes ?? []).map((l) => l.user_id),
        commentCount: p.comments?.[0]?.count ?? 0,
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
      setEmail(user.email ?? null);
      setLoadingAuth(false);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      setUsername(profileData?.username ?? null);

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      setCategories(cats ?? []);

      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowingIds((followRows ?? []).map((r) => r.following_id));

      await loadPosts();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up matching usernames as the person types in the search bar.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setUserResults([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", `%${trimmed}%`)
        .limit(5);

      if (!cancelled) setUserResults(data ?? []);
    }, 200); // small debounce so it doesn't query on every keystroke

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function toggleTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleFilterCategory(id: number) {
    setFilterCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("File is too big — please keep it under 20MB.");
      return;
    }

    setError(null);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!title.trim()) {
      setError("Please give your post a title.");
      return;
    }

    setPosting(true);
    setError(null);

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (mediaFile) {
      media_type = mediaFile.type.startsWith("video") ? "video" : "image";
      const ext = mediaFile.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, mediaFile);

      if (uploadError) {
        setError(uploadError.message);
        setPosting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(path);
      media_url = urlData.publicUrl;
    }

    const { data: newPost, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        title: title.trim(),
        body: content,
        media_url,
        media_type,
      })
      .select("id")
      .single();

    if (error || !newPost) {
      setPosting(false);
      setError(error?.message ?? "Something went wrong — please try again.");
      return;
    }

    if (selectedTagIds.length > 0) {
      await supabase.from("post_categories").insert(
        selectedTagIds.map((category_id) => ({
          post_id: newPost.id,
          category_id,
        }))
      );
    }

    setPosting(false);
    setTitle("");
    setContent("");
    setSelectedTagIds([]);
    clearMedia();
    setShowCompose(false);
    loadPosts();
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
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId });
    }
  }

  function goToProfile(e: MouseEvent, profileId: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${profileId}`);
  }

  async function handleDelete(e: MouseEvent, postId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Delete this post? This can't be undone.")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visiblePosts = posts
    .filter(
      (p) => feedTab === "all" || followingIds.includes(p.author_id)
    )
    .filter(
      (p) =>
        filterCategoryIds.length === 0 ||
        p.tags.some((t) => filterCategoryIds.includes(t.id))
    )
    .filter(
      (p) =>
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.body.toLowerCase().includes(query)
    );

  // Small preview list for the search dropdown (ignores the category filter,
  // so it always reflects the raw keyword match).
  const matchingPostsPreview = query
    ? posts
        .filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.body.toLowerCase().includes(query)
        )
        .slice(0, 5)
    : [];

  // Rank tags by total views across the posts that use them (real traffic,
  // not just post count). A tag needs at least 200 combined views to show up
  // as a "popular search".
  const MIN_VIEWS_FOR_TRENDING = 200;
  const tagViews = new Map<number, { name: string; views: number }>();
  posts.forEach((p) => {
    p.tags.forEach((t) => {
      const entry = tagViews.get(t.id);
      if (entry) entry.views += p.views ?? 0;
      else tagViews.set(t.id, { name: t.name, views: p.views ?? 0 });
    });
  });
  const popularTags = Array.from(tagViews.entries())
    .map(([id, v]) => ({ id, ...v }))
    .filter((t) => t.views >= MIN_VIEWS_FOR_TRENDING)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const rankGlow = (rank: number) =>
    rank === 1
      ? "text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]"
      : rank === 2
        ? "text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.8)]"
        : rank === 3
          ? "text-amber-500 drop-shadow-[0_0_6px_rgba(217,119,6,0.8)]"
          : "text-gray-500";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <BackgroundShapes />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 p-6 sm:flex">
          <Logo size="text-2xl" className="mb-8" />

          {/* Profile info */}
          <div className="mb-8 rounded-xl border border-white/10 bg-neutral-900 p-3">
            <Link
              href={userId ? `/profile/${userId}` : "#"}
              className="block hover:opacity-80"
            >
              <p className="truncate text-sm font-medium text-white">
                {username ?? "You"}
              </p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </Link>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs font-medium text-gray-500 hover:text-red-400"
            >
              Log out
            </button>
          </div>

          {/* Vertical category list — multi-select */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Categories
            </p>
            {filterCategoryIds.length > 0 && (
              <button
                onClick={() => setFilterCategoryIds([])}
                className="text-xs text-gray-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setFilterCategoryIds([])}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                filterCategoryIds.length === 0
                  ? "bg-white text-black"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleFilterCategory(c.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                  filterCategoryIds.includes(c.id)
                    ? "bg-white text-black"
                    : "text-gray-400 hover:bg-white/5"
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* Mobile-only header (sidebar is hidden below sm) */}
            <div className="mb-6 flex items-center justify-between sm:hidden">
              <Logo size="text-3xl" />
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-gray-500 hover:text-gray-300"
              >
                Log out
              </button>
            </div>

            {/* All / Following tabs */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setFeedTab("all")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  feedTab === "all"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFeedTab("following")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  feedTab === "following"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Following
              </button>
            </div>

            {/* Search bar — focusing it opens a trending-searches dropdown */}
            <div className="relative mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchDropdown(false), 150)
                }
                placeholder="Search posts or people…"
                className="w-full rounded-full border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              />

              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  {searchQuery.trim() ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          People
                        </p>
                        {userResults.length === 0 ? (
                          <p className="text-xs text-gray-600">
                            No matching users.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {userResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  router.push(`/profile/${u.id}`);
                                }}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 transition hover:bg-white/5"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                                  {u.username.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="truncate">{u.username}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Posts
                        </p>
                        {matchingPostsPreview.length === 0 ? (
                          <p className="text-xs text-gray-600">
                            No matching posts.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {matchingPostsPreview.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  router.push(`/post/${p.id}`);
                                }}
                                className="truncate rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 transition hover:bg-white/5"
                              >
                                {highlightMatch(p.title, query)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                        Popular searches
                      </p>
                      {popularTags.length === 0 ? (
                        <p className="text-xs text-gray-600">
                          Nothing trending yet — a category needs{" "}
                          {MIN_VIEWS_FOR_TRENDING}+ combined post views to show
                          up here.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {popularTags.map((t, i) => {
                            const rank = i + 1;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  toggleFilterCategory(t.id);
                                  setShowSearchDropdown(false);
                                }}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 transition hover:bg-white/5"
                              >
                                <span
                                  className={`w-4 text-sm font-bold ${rankGlow(rank)}`}
                                >
                                  {rank}
                                </span>
                                <span className="truncate">{t.name}</span>
                                <span className="ml-auto text-xs text-gray-600">
                                  {t.views}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Category filter pills (mobile only — sidebar covers this on larger screens), multi-select */}
            <div className="mb-6 flex flex-wrap gap-2 sm:hidden">
              <button
                onClick={() => setFilterCategoryIds([])}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filterCategoryIds.length === 0
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-gray-400"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleFilterCategory(c.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filterCategoryIds.includes(c.id)
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-gray-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Feed — 2-column waterfall layout */}
            {visiblePosts.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                {query
                  ? "No posts match your search."
                  : feedTab === "following"
                    ? "No posts yet from people you follow."
                    : "No posts yet — be the first to ask something!"}
              </p>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2">
                {visiblePosts.map((post) => {
                  const liked = post.likedBy.includes(userId ?? "");
                  const trending =
                    post.views >= TRENDING_VIEWS ||
                    post.likedBy.length >= TRENDING_LIKES;

                  return (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className="mb-4 block break-inside-avoid rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_30px_rgba(255,255,255,0.04)] transition hover:border-white/25"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <button
                          onClick={(e) => goToProfile(e, post.author_id)}
                          className="flex items-center gap-1.5 font-medium text-gray-300 hover:text-white hover:underline"
                        >
                          {post.profiles?.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                              {(post.profiles?.username ?? "?")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                          )}
                          {post.profiles?.username ?? "Someone"}
                        </button>
                        {trending && (
                          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">
                            Trending
                          </span>
                        )}
                        {post.tags.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full bg-white/10 px-2 py-0.5 text-gray-300"
                          >
                            {t.name}
                          </span>
                        ))}
                        <span>{formatRelativeTime(post.created_at)}</span>
                        {post.author_id === userId && (
                          <button
                            onClick={(e) => handleDelete(e, post.id)}
                            className="ml-auto text-gray-600 hover:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {highlightMatch(post.title, query)}
                      </p>
                      {post.body && (
                        <p className="mt-0.5 text-sm text-gray-200">
                          {highlightMatch(post.body, query)}
                        </p>
                      )}
                      {post.media_url &&
                        (post.media_type === "video" ? (
                          <video
                            src={post.media_url}
                            controls
                            className="mt-2 max-h-80 w-full rounded-lg"
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt=""
                            className="mt-2 max-h-80 w-full rounded-lg object-cover"
                          />
                        ))}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <button
                          onClick={(e) => toggleLike(e, post.id, liked)}
                          className={`flex items-center gap-1 font-medium transition ${
                            liked
                              ? "text-red-400"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          <span
                            className={
                              liked
                                ? "drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                                : ""
                            }
                          >
                            ♥
                          </span>
                          {post.likedBy.length}
                        </button>
                        <span>
                          {post.commentCount}{" "}
                          {post.commentCount === 1 ? "reply" : "replies"}
                        </span>
                        <span>{post.views} views</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating "new post" button */}
      <button
        onClick={() => setShowCompose(true)}
        aria-label="New post"
        className="fixed bottom-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/30 shadow-[0_0_25px_rgba(255,255,255,0.45)] transition hover:shadow-[0_0_35px_rgba(255,255,255,0.7)]"
      >
        <span className="text-3xl leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
          +
        </span>
      </button>

      {/* Compose modal */}
      {showCompose && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowCompose(false)}
        >
          <form
            onSubmit={handlePost}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">New post</p>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              autoFocus
              className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ask anything about life in Halifax… (optional)"
              rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />

            {mediaPreview && (
              <div className="relative mt-3 inline-block">
                {mediaFile?.type.startsWith("video") ? (
                  <video
                    src={mediaPreview}
                    className="max-h-40 rounded-lg"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Selected upload preview"
                    className="max-h-40 rounded-lg object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white ring-1 ring-white/20"
                >
                  ×
                </button>
              </div>
            )}

            {/* Multi-select tags */}
            <p className="mb-1.5 mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Tags (pick as many as apply)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleTag(c.id)}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    selectedTagIds.includes(c.id)
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-gray-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                >
                  + Photo/Video
                </button>
              </div>
              <button
                type="submit"
                disabled={posting || !title.trim()}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
