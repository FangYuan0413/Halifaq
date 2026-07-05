"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import { useToast } from "@/components/ToastProvider";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

type Tag = { id: number; name: string };

type PostDetail = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  media_url: string | null;
  media_type: string | null;
  profiles: { username: string; avatar_url: string | null } | null;
  tags: Tag[];
  likedBy: string[];
};

// Shape Supabase returns for the nested join: post_categories -> categories
type RawPost = Omit<PostDetail, "tags" | "likedBy"> & {
  post_categories: { categories: Tag | null }[] | null;
  post_likes: { user_id: string }[] | null;
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function loadPost() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, media_url, media_type, profiles!posts_author_id_fkey(username, avatar_url), post_categories(categories(id, name)), post_likes(user_id)"
      )
      .eq("id", postId)
      .single();

    if (error || !data) {
      // Log the real reason instead of just showing "not found" for everything.
      console.error("loadPost failed for id", postId, error);
      setNotFound(true);
      return;
    }

    const raw = data as unknown as RawPost;
    setPost({
      ...raw,
      tags: (raw.post_categories ?? [])
        .map((pc) => pc.categories)
        .filter((c): c is Tag => c !== null),
      likedBy: (raw.post_likes ?? []).map((l) => l.user_id),
    });
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, created_at, author_id, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data as unknown as Comment[]);
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
      await loadPost();
      await loadComments();
      // Fire-and-forget: bump this post's view count (used for the feed's
      // "popular searches" ranking). Don't block rendering on it.
      supabase.rpc("increment_post_views", { post_id: postId });
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !userId) return;

    setPosting(true);
    setError(null);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: userId,
      body: reply,
    });

    setPosting(false);

    if (error) {
      setError(error.message);
      showToast(`Reply failed — ${error.message}`, "error");
      return;
    }

    setReply("");
    showToast("Reply posted!");
    await loadComments();
  }

  async function toggleLike() {
    if (!userId || !post) return;
    const liked = post.likedBy.includes(userId);

    setPost({
      ...post,
      likedBy: liked
        ? post.likedBy.filter((id) => id !== userId)
        : [...post.likedBy, userId],
    });

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      showToast("Unliked");
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      showToast("Liked!");
    }
  }

  async function handleDeletePost() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      showToast("Post deleted.");
      router.push("/feed");
      router.refresh();
    } else {
      showToast(`Couldn't delete post — ${error.message}`, "error");
    }
  }

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-center">
        <p className="text-sm text-gray-500">
          This post doesn&apos;t exist (or was removed).
        </p>
        <Link
          href="/feed"
          className="text-sm text-white underline underline-offset-4"
        >
          Back to feed
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8">
      <BackgroundShapes />

      <div className="relative z-10 mx-auto max-w-xl">
        <Link
          href="/feed"
          className="mb-6 inline-block text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          &larr; Back to feed
        </Link>

        {post && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_30px_rgba(255,255,255,0.04)]">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Link
                href={`/profile/${post.author_id}`}
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
                    {(post.profiles?.username ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                {post.profiles?.username ?? "Someone"}
              </Link>
              {post.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-gray-300"
                >
                  {t.name}
                </span>
              ))}
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              {post.author_id === userId && (
                <button
                  onClick={handleDeletePost}
                  className="ml-auto text-gray-600 hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="text-base font-semibold text-white">{post.title}</p>
            {post.body && (
              <p className="mt-1 text-sm text-gray-100">{post.body}</p>
            )}
            {post.media_url &&
              (post.media_type === "video" ? (
                <video
                  src={post.media_url}
                  controls
                  className="mt-2 max-h-[28rem] w-full rounded-lg"
                />
              ) : (
                <img
                  src={post.media_url}
                  alt=""
                  className="mt-2 max-h-[28rem] w-full rounded-lg object-cover"
                />
              ))}
            <button
              onClick={toggleLike}
              className={`mt-3 flex items-center gap-1.5 text-xs font-medium transition ${
                post.likedBy.includes(userId ?? "")
                  ? "text-red-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span
                className={
                  post.likedBy.includes(userId ?? "")
                    ? "drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                    : ""
                }
              >
                ♥
              </span>
              {post.likedBy.length}
            </button>
          </div>
        )}

        {/* Reply box */}
        <form
          onSubmit={handleReply}
          className="mb-6 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_30px_rgba(255,255,255,0.04)]"
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={posting || !reply.trim()}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {posting ? "Replying…" : "Reply"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </form>

        {/* Replies list */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {comments.length} {comments.length === 1 ? "reply" : "replies"}
          </p>
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/10 bg-neutral-900 p-4"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <Link
                  href={`/profile/${c.author_id}`}
                  className="flex items-center gap-1.5 font-medium text-gray-300 hover:text-white hover:underline"
                >
                  {c.profiles?.avatar_url ? (
                    <img
                      src={c.profiles.avatar_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                      {(c.profiles?.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {c.profiles?.username ?? "Someone"}
                </Link>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-200">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
