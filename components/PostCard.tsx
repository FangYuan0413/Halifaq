"use client";

import { MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MediaCarousel, { MediaItem } from "./MediaCarousel";
import AdminBadge from "./AdminBadge";
import {
  formatRelativeTime,
  highlightMatch,
  TRENDING_VIEWS,
  TRENDING_LIKES,
} from "@/utils/postDisplay";

export type Tag = { id: number; name: string };

export type PostCardData = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  media: MediaItem[];
  views: number;
  commentCount: number;
  profiles: {
    username: string;
    avatar_url: string | null;
    is_admin?: boolean;
  } | null;
  tags: Tag[];
  likedBy: string[];
};

// One post card in the feed/topic/hot/for-you waterfall grid. Shared so all
// those views stay visually consistent instead of drifting apart.
export default function PostCard({
  post,
  userId,
  query = "",
  isAdmin = false,
  onToggleLike,
  onDelete,
  onSendWarning,
}: {
  post: PostCardData;
  userId: string | null;
  query?: string;
  isAdmin?: boolean;
  onToggleLike: (e: MouseEvent, postId: string, liked: boolean) => void;
  onDelete: (e: MouseEvent, postId: string) => void;
  onSendWarning?: (
    authorId: string,
    postId: string,
    postTitle: string,
    message: string
  ) => void | Promise<void>;
}) {
  const router = useRouter();
  const liked = post.likedBy.includes(userId ?? "");
  const trending =
    post.views >= TRENDING_VIEWS || post.likedBy.length >= TRENDING_LIKES;
  const canDelete = post.author_id === userId || isAdmin;
  const canWarn = isAdmin && post.author_id !== userId && onSendWarning;

  const [warnOpen, setWarnOpen] = useState(false);
  const [warnMessage, setWarnMessage] = useState("");
  const [sendingWarning, setSendingWarning] = useState(false);

  function goToProfile(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${post.author_id}`);
  }

  function openWarn(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWarnOpen(true);
  }

  function closeWarn(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setWarnOpen(false);
    setWarnMessage("");
  }

  async function submitWarn(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!warnMessage.trim() || !onSendWarning) return;
    setSendingWarning(true);
    await onSendWarning(post.author_id, post.id, post.title, warnMessage.trim());
    setSendingWarning(false);
    closeWarn();
  }

  return (
    <>
      <Link
        href={`/post/${post.id}`}
        className="mb-4 block break-inside-avoid rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_30px_rgba(255,255,255,0.04)] transition hover:border-white/25"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <button
            onClick={goToProfile}
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
          </button>
          {post.profiles?.is_admin && <AdminBadge />}
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
          {canWarn && (
            <button
              onClick={openWarn}
              className="ml-auto text-gray-600 hover:text-amber-400"
            >
              Warn
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => onDelete(e, post.id)}
              className={
                canWarn
                  ? "text-gray-600 hover:text-red-400"
                  : "ml-auto text-gray-600 hover:text-red-400"
              }
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-sm font-semibold text-white">
          {highlightMatch(post.title, query)}
        </p>
        {post.body && (
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-200">
            {highlightMatch(post.body, query)}
          </p>
        )}
        <MediaCarousel media={post.media} />
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <button
            onClick={(e) => onToggleLike(e, post.id, liked)}
            className={`flex items-center gap-1 font-medium transition ${
              liked ? "text-red-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span
              className={
                liked ? "drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]" : ""
              }
            >
              ♥
            </span>
            {post.likedBy.length}
          </button>
          <span>
            {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
          </span>
          <span>{post.views} views</span>
        </div>
      </Link>

      {warnOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
          onClick={(e) => closeWarn(e)}
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
                onClick={(e) => closeWarn(e)}
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
                onClick={(e) => closeWarn(e)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitWarn}
                disabled={sendingWarning || !warnMessage.trim()}
                className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {sendingWarning ? "Sending…" : "Send warning"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
