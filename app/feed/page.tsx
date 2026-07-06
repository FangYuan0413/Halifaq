"use client";

import {
  useEffect,
  useRef,
  useState,
  FormEvent,
  ChangeEvent,
  MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import Logo from "@/components/Logo";
import { MediaItem } from "@/components/MediaCarousel";
import PostCard from "@/components/PostCard";
import { useToast } from "@/components/ToastProvider";
import {
  highlightMatch,
  hotScore,
  buildPreferenceProfile,
  forYouScore,
} from "@/utils/postDisplay";
import {
  loadSearchHistory,
  addSearchHistoryTerm,
  removeSearchHistoryTerm,
  clearSearchHistory,
  SEARCH_HISTORY_VISIBLE_COUNT,
} from "@/utils/searchHistory";

const MAX_IMAGES = 9;

type Category = { id: number; name: string; slug: string };
type Tag = { id: number; name: string };
type UserResult = { id: string; username: string };

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

type FeedTab = "all" | "following" | "hot" | "forYou";

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
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

  // Multi-image (up to 9) OR a single video — mutually exclusive.
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isVideo, setIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, views, profiles!posts_author_id_fkey(username, avatar_url), post_categories(categories(id, name)), post_likes(user_id), comments(count), post_media(url, media_type, position)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadPosts failed", error);
    }

    if (!error && data) {
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

  // Recent search terms, kept in this browser only (localStorage) — shows
  // above "Popular searches" when the search box is empty, and shared with
  // the dedicated /search results page.
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  function addToHistory(term: string) {
    setSearchHistory(addSearchHistoryTerm(term, searchHistory));
  }

  function removeFromHistory(term: string) {
    setSearchHistory(removeSearchHistoryTerm(term, searchHistory));
  }

  function clearHistory() {
    setSearchHistory(clearSearchHistory());
    setHistoryExpanded(false);
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

  function clearMedia() {
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setMediaFiles([]);
    setMediaPreviews([]);
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const video = files.find((f) => f.type.startsWith("video"));

    if (video) {
      if (video.size > 50 * 1024 * 1024) {
        showToast("Upload failed — video is over 50MB.", "error");
        return;
      }
      // A video replaces any photos already selected — one or the other.
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
      setIsVideo(true);
      setMediaFiles([video]);
      setMediaPreviews([URL.createObjectURL(video)]);
      setError(null);
      return;
    }

    if (isVideo) {
      // Switching from a video to photos — start fresh.
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
      setIsVideo(false);
      setMediaFiles([]);
      setMediaPreviews([]);
    }

    const room = MAX_IMAGES - (isVideo ? 0 : mediaFiles.length);
    const oversized = files.some((f) => f.size > 20 * 1024 * 1024);
    const usable = files
      .filter((f) => f.size <= 20 * 1024 * 1024)
      .slice(0, room);

    if (files.length > room || oversized) {
      showToast(
        `Only added what fit — up to ${MAX_IMAGES} photos, each under 20MB.`,
        "error"
      );
    }

    if (usable.length === 0) return;

    setError(null);
    setMediaFiles((prev) => [...prev, ...usable]);
    setMediaPreviews((prev) => [
      ...prev,
      ...usable.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeMediaAt(index: number) {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    if (mediaFiles.length <= 1) setIsVideo(false);
  }

  function moveMedia(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= mediaFiles.length) return;

    setMediaFiles((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMediaPreviews((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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

    const { data: newPost, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        title: title.trim(),
        body: content,
      })
      .select("id")
      .single();

    if (error || !newPost) {
      setPosting(false);
      const message = error?.message ?? "Something went wrong — please try again.";
      setError(message);
      showToast(`Post failed — ${message}`, "error");
      return;
    }

    if (mediaFiles.length > 0) {
      const mediaRows: { post_id: string; url: string; media_type: string; position: number }[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const media_type = isVideo ? "video" : "image";
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, file);

        if (uploadError) {
          setPosting(false);
          setError(uploadError.message);
          showToast(`Upload failed — ${uploadError.message}`, "error");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(path);

        mediaRows.push({
          post_id: newPost.id,
          url: urlData.publicUrl,
          media_type,
          position: i,
        });
      }

      await supabase.from("post_media").insert(mediaRows);
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
    showToast("Posted!");
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
  const baseFiltered = posts
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

  let visiblePosts: Post[];
  if (feedTab === "following") {
    visiblePosts = baseFiltered.filter((p) =>
      followingIds.includes(p.author_id)
    );
  } else if (feedTab === "hot") {
    // Views + likes + comments, decayed by age (classic "hot" ranking) so
    // fresh popular posts rise without old ones dominating forever.
    visiblePosts = [...baseFiltered].sort(
      (a, b) => hotScore(b) - hotScore(a)
    );
  } else if (feedTab === "forYou") {
    // Build a lightweight taste profile from tags/keywords of posts this
    // user has liked, then rank everything by how well it matches — with
    // "hot" as the tie-breaker (and as the fallback ranking entirely, for
    // someone who hasn't liked anything yet).
    const likedPosts = posts.filter((p) => p.likedBy.includes(userId ?? ""));
    const profile = buildPreferenceProfile(likedPosts);
    visiblePosts = [...baseFiltered].sort((a, b) => {
      const diff = forYouScore(b, profile) - forYouScore(a, profile);
      return diff !== 0 ? diff : hotScore(b) - hotScore(a);
    });
  } else {
    visiblePosts = baseFiltered;
  }

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
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-lg px-3 py-2 text-left text-sm text-gray-400 transition hover:bg-white/5"
              >
                {c.name}
              </Link>
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

            {/* All / Following / Hot / For You tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["following", "Following"],
                  ["hot", "Hot"],
                  ["forYou", "For You"],
                ] as [FeedTab, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setFeedTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    feedTab === tab
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    addToHistory(searchQuery.trim());
                    setShowSearchDropdown(false);
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search posts or people… (press Enter for full results)"
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
                      {searchHistory.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Search history
                            </p>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={clearHistory}
                              className="text-xs text-gray-500 hover:text-white"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(historyExpanded
                              ? searchHistory
                              : searchHistory.slice(
                                  0,
                                  SEARCH_HISTORY_VISIBLE_COUNT
                                )
                            ).map((term) => (
                              <div
                                key={term}
                                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 text-xs text-gray-300"
                              >
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    addToHistory(term);
                                    setShowSearchDropdown(false);
                                    router.push(`/search?q=${encodeURIComponent(term)}`);
                                  }}
                                  className="max-w-[9rem] truncate hover:text-white"
                                >
                                  {term}
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => removeFromHistory(term)}
                                  aria-label={`Remove "${term}" from history`}
                                  className="text-gray-600 hover:text-white"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {searchHistory.length > SEARCH_HISTORY_VISIBLE_COUNT && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setHistoryExpanded((v) => !v)}
                              className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-white"
                            >
                              {historyExpanded ? "Show less" : "Show more"}
                              <span>{historyExpanded ? "▲" : "▼"}</span>
                            </button>
                          )}
                        </div>
                      )}

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

                  {/* Tag filter — combine with the keyword search above.
                      Doesn't close the dropdown, so you can toggle a few
                      tags without losing your place. */}
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Filter by tag
                      </p>
                      {filterCategoryIds.length > 0 && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setFilterCategoryIds([])}
                          className="text-xs text-gray-500 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggleFilterCategory(c.id)}
                          className={`rounded-full px-2.5 py-1 text-xs transition ${
                            filterCategoryIds.includes(c.id)
                              ? "bg-white text-black"
                              : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {filterCategoryIds.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500">Filtering:</span>
                  {filterCategoryIds.map((id) => {
                    const cat = categories.find((c) => c.id === id);
                    if (!cat) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFilterCategory(id)}
                        className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-black"
                      >
                        {cat.name}
                        <span className="text-gray-500">×</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFilterCategoryIds([])}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    Clear all
                  </button>
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
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-400"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            {/* Feed — 2-column waterfall layout */}
            {visiblePosts.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                {query
                  ? "No posts match your search."
                  : feedTab === "following"
                    ? "No posts yet from people you follow."
                    : feedTab === "forYou"
                      ? "Like a few posts and we'll start tailoring this tab to you."
                      : "No posts yet — be the first to ask something!"}
              </p>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2">
                {visiblePosts.map((post) => (
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

            {mediaPreviews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {mediaPreviews.map((preview, i) => (
                  <div
                    key={preview}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10"
                  >
                    {isVideo ? (
                      <video src={preview} className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={preview}
                        alt="Selected upload preview"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMediaAt(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white ring-1 ring-white/20"
                    >
                      ×
                    </button>
                    {!isVideo && mediaPreviews.length > 1 && (
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-0.5">
                        <button
                          type="button"
                          onClick={() => moveMedia(i, -1)}
                          disabled={i === 0}
                          className="px-1 text-xs text-white disabled:opacity-30"
                        >
                          ‹
                        </button>
                        <span className="text-[10px] text-gray-300">
                          {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveMedia(i, 1)}
                          disabled={i === mediaPreviews.length - 1}
                          className="px-1 text-xs text-white disabled:opacity-30"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                ))}
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
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVideo || mediaFiles.length >= MAX_IMAGES}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
                >
                  {mediaFiles.length > 0 && !isVideo
                    ? `+ Photo (${mediaFiles.length}/${MAX_IMAGES})`
                    : "+ Photo/Video"}
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
