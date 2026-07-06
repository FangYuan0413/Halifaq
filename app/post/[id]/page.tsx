"use client";

import { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import MediaCarousel, { MediaItem } from "@/components/MediaCarousel";
import { useToast } from "@/components/ToastProvider";
import AdminBadge from "@/components/AdminBadge";
import MikuChibi from "@/components/MikuChibi";
import { useTheme } from "@/utils/useTheme";

const MAX_REPLY_IMAGES = 3;

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  media: MediaItem[];
  parent_comment_id: string | null;
  reply_to_username: string | null;
  profiles: { username: string; avatar_url: string | null; is_admin?: boolean } | null;
};

// Shape Supabase returns for the nested join
type RawComment = Omit<Comment, "media"> & {
  comment_media: { url: string; position: number }[] | null;
};

type Tag = { id: number; name: string };

type PostDetail = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  media: MediaItem[];
  profiles: { username: string; avatar_url: string | null; is_admin?: boolean } | null;
  tags: Tag[];
  likedBy: string[];
};

// Shape Supabase returns for the nested joins
type RawPost = Omit<PostDetail, "tags" | "likedBy" | "media"> & {
  post_categories: { categories: Tag | null }[] | null;
  post_likes: { user_id: string }[] | null;
  post_media: { url: string; media_type: string; position: number }[] | null;
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const supabase = createClient();
  const { showToast } = useToast();
  const theme = useTheme();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Admin "warn the author" modal.
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnMessage, setWarnMessage] = useState("");
  const [sendingWarning, setSendingWarning] = useState(false);

  // Up to 3 photos on a reply.
  const [replyMediaFiles, setReplyMediaFiles] = useState<File[]>([]);
  const [replyMediaPreviews, setReplyMediaPreviews] = useState<string[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Replying to a specific comment/reply (nests under that comment's
  // top-level thread, tagged "Reply to @username"). Only one nested reply
  // box is open at a time.
  const [replyingTo, setReplyingTo] = useState<{
    parentId: string;
    toUsername: string;
  } | null>(null);
  const [nestedReplyText, setNestedReplyText] = useState("");
  const [nestedPosting, setNestedPosting] = useState(false);
  const [nestedError, setNestedError] = useState<string | null>(null);
  const [nestedMediaFiles, setNestedMediaFiles] = useState<File[]>([]);
  const [nestedMediaPreviews, setNestedMediaPreviews] = useState<string[]>([]);
  const nestedFileInputRef = useRef<HTMLInputElement>(null);

  // Threads with more than 2 replies start collapsed; ids in this set are
  // expanded to show every reply.
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  async function loadPost() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, profiles!posts_author_id_fkey(username, avatar_url, is_admin), post_categories(categories(id, name)), post_likes(user_id), post_media(url, media_type, position)"
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
      media: (raw.post_media ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((m) => ({ url: m.url, media_type: m.media_type })),
    });
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("comments")
      .select(
        "id, body, created_at, author_id, parent_comment_id, reply_to_username, profiles(username, avatar_url, is_admin), comment_media(url, position)"
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("loadComments failed", error);
    }

    if (!error && data) {
      const withMedia = (data as unknown as RawComment[]).map((c) => ({
        ...c,
        media: (c.comment_media ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((m) => ({ url: m.url, media_type: "image" })),
      }));
      setComments(withMedia);
    }
  }

  function handleReplyFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = MAX_REPLY_IMAGES - replyMediaFiles.length;
    const oversized = files.some((f) => f.size > 20 * 1024 * 1024);
    const usable = files.filter((f) => f.size <= 20 * 1024 * 1024).slice(0, room);

    if (files.length > room || oversized) {
      showToast(
        `Only added what fit — up to ${MAX_REPLY_IMAGES} photos, each under 20MB.`,
        "error"
      );
    }

    if (usable.length === 0) return;

    setReplyMediaFiles((prev) => [...prev, ...usable]);
    setReplyMediaPreviews((prev) => [
      ...prev,
      ...usable.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeReplyMediaAt(index: number) {
    URL.revokeObjectURL(replyMediaPreviews[index]);
    setReplyMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setReplyMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function clearReplyMedia() {
    replyMediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setReplyMediaFiles([]);
    setReplyMediaPreviews([]);
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  }

  function clearNestedMedia() {
    nestedMediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setNestedMediaFiles([]);
    setNestedMediaPreviews([]);
    if (nestedFileInputRef.current) nestedFileInputRef.current.value = "";
  }

  function openReplyTo(parentId: string, toUsername: string) {
    setReplyingTo({ parentId, toUsername });
    setNestedReplyText("");
    setNestedError(null);
    clearNestedMedia();
  }

  function cancelNestedReply() {
    setReplyingTo(null);
    setNestedReplyText("");
    setNestedError(null);
    clearNestedMedia();
  }

  function toggleExpandThread(id: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNestedFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = MAX_REPLY_IMAGES - nestedMediaFiles.length;
    const oversized = files.some((f) => f.size > 20 * 1024 * 1024);
    const usable = files.filter((f) => f.size <= 20 * 1024 * 1024).slice(0, room);

    if (files.length > room || oversized) {
      showToast(
        `Only added what fit — up to ${MAX_REPLY_IMAGES} photos, each under 20MB.`,
        "error"
      );
    }

    if (usable.length === 0) return;

    setNestedMediaFiles((prev) => [...prev, ...usable]);
    setNestedMediaPreviews((prev) => [
      ...prev,
      ...usable.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeNestedMediaAt(index: number) {
    URL.revokeObjectURL(nestedMediaPreviews[index]);
    setNestedMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setNestedMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleNestedReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!nestedReplyText.trim() || !userId || !replyingTo) return;

    const { parentId, toUsername } = replyingTo;

    setNestedPosting(true);
    setNestedError(null);

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: userId,
        body: nestedReplyText,
        parent_comment_id: parentId,
        reply_to_username: toUsername,
      })
      .select("id")
      .single();

    if (error || !newComment) {
      setNestedPosting(false);
      const message = error?.message ?? "Something went wrong — please try again.";
      setNestedError(message);
      showToast(`Reply failed — ${message}`, "error");
      return;
    }

    if (nestedMediaFiles.length > 0) {
      const mediaRows: { comment_id: string; url: string; position: number }[] = [];

      for (let i = 0; i < nestedMediaFiles.length; i++) {
        const file = nestedMediaFiles[i];
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/comments/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, file);

        if (uploadError) {
          setNestedPosting(false);
          setNestedError(uploadError.message);
          showToast(`Upload failed — ${uploadError.message}`, "error");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(path);

        mediaRows.push({
          comment_id: newComment.id,
          url: urlData.publicUrl,
          position: i,
        });
      }

      await supabase.from("comment_media").insert(mediaRows);
    }

    setNestedPosting(false);
    cancelNestedReply();
    setExpandedThreads((prev) => new Set(prev).add(parentId));
    showToast("Reply posted!");
    await loadComments();
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(profileData?.is_admin ?? false);

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

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: userId,
        body: reply,
      })
      .select("id")
      .single();

    if (error || !newComment) {
      setPosting(false);
      const message = error?.message ?? "Something went wrong — please try again.";
      setError(message);
      showToast(`Reply failed — ${message}`, "error");
      return;
    }

    if (replyMediaFiles.length > 0) {
      const mediaRows: { comment_id: string; url: string; position: number }[] = [];

      for (let i = 0; i < replyMediaFiles.length; i++) {
        const file = replyMediaFiles[i];
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/comments/${Date.now()}-${i}.${ext}`;

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
          comment_id: newComment.id,
          url: urlData.publicUrl,
          position: i,
        });
      }

      await supabase.from("comment_media").insert(mediaRows);
    }

    setPosting(false);
    setReply("");
    clearReplyMedia();
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

  async function handleSendWarning() {
    if (!post || !warnMessage.trim()) return;
    setSendingWarning(true);

    const { error } = await supabase.from("warnings").insert({
      user_id: post.author_id,
      issued_by: userId,
      post_title: post.title,
      message: warnMessage.trim(),
    });

    setSendingWarning(false);

    if (error) {
      showToast(`Couldn't send warning — ${error.message}`, "error");
    } else {
      showToast("Warning sent.");
      setWarnOpen(false);
      setWarnMessage("");
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

  const canDeletePost = !!post && (post.author_id === userId || isAdmin);
  const canWarnAuthor = !!post && isAdmin && post.author_id !== userId;

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = new Map<string, Comment[]>();
  comments.forEach((c) => {
    if (c.parent_comment_id) {
      const arr = repliesByParent.get(c.parent_comment_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_comment_id, arr);
    }
  });

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
              {post.profiles?.is_admin && <AdminBadge />}
              {post.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-gray-300"
                >
                  {t.name}
                </span>
              ))}
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              {canWarnAuthor && (
                <button
                  onClick={() => setWarnOpen(true)}
                  className="ml-auto text-gray-600 hover:text-amber-400"
                >
                  Warn
                </button>
              )}
              {canDeletePost && (
                <button
                  onClick={handleDeletePost}
                  className={canWarnAuthor ? "text-gray-600 hover:text-red-400" : "ml-auto text-gray-600 hover:text-red-400"}
                >
                  Delete
                </button>
              )}
            </div>
            <p className="text-base font-semibold text-white">{post.title}</p>
            {post.body && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-100">
                {post.body}
              </p>
            )}
            <MediaCarousel media={post.media} />
            <button
              onClick={toggleLike}
              className={`mt-3 flex items-center gap-1.5 text-xs font-medium transition ${
                post.likedBy.includes(userId ?? "")
                  ? "text-red-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {theme === "miku" && post.likedBy.includes(userId ?? "") ? (
                <MikuChibi className="h-4 w-4" />
              ) : (
                <span
                  className={
                    post.likedBy.includes(userId ?? "")
                      ? "drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                      : ""
                  }
                >
                  ♥
                </span>
              )}
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

          {replyMediaPreviews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {replyMediaPreviews.map((preview, i) => (
                <div
                  key={preview}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10"
                >
                  <img
                    src={preview}
                    alt="Selected upload preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeReplyMediaAt(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white ring-1 ring-white/20"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={replyFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleReplyFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => replyFileInputRef.current?.click()}
                disabled={replyMediaFiles.length >= MAX_REPLY_IMAGES}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
              >
                {replyMediaFiles.length > 0
                  ? `+ Photo (${replyMediaFiles.length}/${MAX_REPLY_IMAGES})`
                  : "+ Photo"}
              </button>
            </div>
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
          {topLevelComments.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const expanded = expandedThreads.has(c.id);
            const visibleReplies = expanded ? replies : replies.slice(0, 2);
            const hiddenCount = replies.length - visibleReplies.length;

            return (
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
                  {c.profiles?.is_admin && <AdminBadge />}
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-200">
                  {c.body}
                </p>
                <MediaCarousel media={c.media} />
                <button
                  type="button"
                  onClick={() =>
                    openReplyTo(c.id, c.profiles?.username ?? "Someone")
                  }
                  className="mt-2 text-xs font-medium text-gray-500 hover:text-white"
                >
                  Reply
                </button>

                {/* Nested replies for this thread */}
                {replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-2 border-l border-white/10 pl-3">
                    {visibleReplies.map((r) => (
                      <div key={r.id} className="rounded-xl bg-black/30 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                          <Link
                            href={`/profile/${r.author_id}`}
                            className="flex items-center gap-1.5 font-medium text-gray-300 hover:text-white hover:underline"
                          >
                            {r.profiles?.avatar_url ? (
                              <img
                                src={r.profiles.avatar_url}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                                {(r.profiles?.username ?? "?")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                            )}
                            {r.profiles?.username ?? "Someone"}
                          </Link>
                          {r.profiles?.is_admin && <AdminBadge />}
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.reply_to_username && (
                          <p className="text-xs font-medium text-cyan-400">
                            Reply to @{r.reply_to_username}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-sm text-gray-200">
                          {r.body}
                        </p>
                        <MediaCarousel media={r.media} />
                        <button
                          type="button"
                          onClick={() =>
                            openReplyTo(c.id, r.profiles?.username ?? "Someone")
                          }
                          className="mt-1 text-xs font-medium text-gray-500 hover:text-white"
                        >
                          Reply
                        </button>
                      </div>
                    ))}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpandThread(c.id)}
                        className="text-xs font-medium text-gray-500 hover:text-white"
                      >
                        View {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                      </button>
                    )}
                    {expanded && replies.length > 2 && (
                      <button
                        type="button"
                        onClick={() => toggleExpandThread(c.id)}
                        className="text-xs font-medium text-gray-500 hover:text-white"
                      >
                        Collapse replies
                      </button>
                    )}
                  </div>
                )}

                {/* Inline nested-reply compose box */}
                {replyingTo?.parentId === c.id && (
                  <form
                    onSubmit={handleNestedReplySubmit}
                    className="mt-3 ml-4 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <p className="mb-1.5 text-xs font-medium text-cyan-400">
                      Reply to @{replyingTo.toUsername}
                    </p>
                    <textarea
                      value={nestedReplyText}
                      onChange={(e) => setNestedReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      autoFocus
                      className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                    />

                    {nestedMediaPreviews.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nestedMediaPreviews.map((preview, i) => (
                          <div
                            key={preview}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10"
                          >
                            <img
                              src={preview}
                              alt="Selected upload preview"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeNestedMediaAt(i)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white ring-1 ring-white/20"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          ref={nestedFileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleNestedFileSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => nestedFileInputRef.current?.click()}
                          disabled={nestedMediaFiles.length >= MAX_REPLY_IMAGES}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
                        >
                          {nestedMediaFiles.length > 0
                            ? `+ Photo (${nestedMediaFiles.length}/${MAX_REPLY_IMAGES})`
                            : "+ Photo"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelNestedReply}
                          className="text-xs font-medium text-gray-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={nestedPosting || !nestedReplyText.trim()}
                        className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                      >
                        {nestedPosting ? "Replying…" : "Reply"}
                      </button>
                    </div>
                    {nestedError && (
                      <p className="mt-2 text-xs text-red-400">{nestedError}</p>
                    )}
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {warnOpen && post && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setWarnOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">
                Warn {post.profiles?.username ?? "this user"}
              </p>
              <button
                type="button"
                onClick={() => setWarnOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              About: <span className="text-gray-300">{post.title}</span>
            </p>
            <textarea
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
              placeholder="Explain what rule this post breaks…"
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWarnOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWarning}
                disabled={sendingWarning || !warnMessage.trim()}
                className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {sendingWarning ? "Sending…" : "Send warning"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
