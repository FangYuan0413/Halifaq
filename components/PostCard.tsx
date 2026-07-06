"use client";

import { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MediaCarousel, { MediaItem } from "./MediaCarousel";
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
  profiles: { username: string; avatar_url: string | null } | null;
  tags: Tag[];
  likedBy: string[];
};

// One post card in the feed/topic/hot/for-you waterfall grid. Shared so all
// those views stay visually consistent instead of drifting apart.
export default function PostCard({
  post,
  userId,
  query = "",
  onToggleLike,
  onDelete,
}: {
  post: PostCardData;
  userId: string | null;
  query?: string;
  onToggleLike: (e: MouseEvent, postId: string, liked: boolean) => void;
  onDelete: (e: MouseEvent, postId: string) => void;
}) {
  const router = useRouter();
  const liked = post.likedBy.includes(userId ?? "");
  const trending =
    post.views >= TRENDING_VIEWS || post.likedBy.length >= TRENDING_LIKES;

  function goToProfile(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${post.author_id}`);
  }

  return (
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
            onClick={(e) => onDelete(e, post.id)}
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
  );
}
