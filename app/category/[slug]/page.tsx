"use client";

import { useEffect, useState, MouseEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import { MediaItem } from "@/components/MediaCarousel";
import PostCard from "@/components/PostCard";
import { useToast } from "@/components/ToastProvider";

type Tag = { id: number; name: string };
type Category = { id: number; name: string; slug: string; views: number };

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

// Dedicated "topic zone" for one category — everyone who clicks that
// category from the sidebar lands here, instead of just filtering the main
// feed in place. Posts tagged with multiple categories show up on every
// matching category's page.
export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notFound, setNotFound] = useState(false);

  async function loadPosts(categoryId: number) {
    // Two-step lookup (instead of an inner-join filter) so each post still
    // shows *all* of its tags, not just the one that matched this category.
    const { data: linkRows } = await supabase
      .from("post_categories")
      .select("post_id")
      .eq("category_id", categoryId);

    const postIds = (linkRows ?? []).map((r) => r.post_id);
    if (postIds.length === 0) {
      setPosts([]);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, created_at, author_id, views, profiles!posts_author_id_fkey(username, avatar_url), post_categories(categories(id, name)), post_likes(user_id), comments(count), post_media(url, media_type, position)"
      )
      .in("id", postIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadPosts (category) failed", error);
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

      const { data: cat, error } = await supabase
        .from("categories")
        .select("id, name, slug, views")
        .eq("slug", slug)
        .single();

      if (error || !cat) {
        console.error("loadCategory failed for slug", slug, error);
        setNotFound(true);
        return;
      }

      setCategory(cat);
      await loadPosts(cat.id);
      // Fire-and-forget: bump this topic's view count. Don't block render.
      supabase.rpc("increment_category_views", { category_id: cat.id });
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-center">
        <p className="text-sm text-gray-500">This topic doesn&apos;t exist.</p>
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

      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          href="/feed"
          className="mb-6 inline-block text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          &larr; Back to feed
        </Link>

        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-white">{category?.name}</h1>
          <span className="text-xs text-gray-500">
            {category?.views ?? 0} views
          </span>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            No posts in this topic yet — be the first to ask something!
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
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
