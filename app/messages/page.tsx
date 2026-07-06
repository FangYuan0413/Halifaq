"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import AdminBadge from "@/components/AdminBadge";
import { formatRelativeTime } from "@/utils/postDisplay";
import { markActivitySeen } from "@/utils/notifications";

type Tab = "chats" | "replies" | "mentions" | "likes";

type Profile = {
  username: string;
  avatar_url: string | null;
  is_admin?: boolean;
};

type Conversation = {
  otherUserId: string;
  profile: Profile | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
};

type LikeGroup = {
  postId: string;
  postTitle: string;
  firstLiker: Profile | null;
  totalLikers: number;
  latestAt: string;
};

type ReplyItem = {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  createdAt: string;
  profile: Profile | null;
};

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chats");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [likeGroups, setLikeGroups] = useState<LikeGroup[]>([]);
  const [replies, setReplies] = useState<ReplyItem[]>([]);

  async function loadConversations(uid: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, media_type, created_at, read")
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("loadConversations failed", error);
      return;
    }

    const byOther = new Map<
      string,
      { lastMessage: string; lastMessageAt: string; unread: boolean }
    >();

    for (const m of data) {
      const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id;
      const preview = m.body?.trim()
        ? m.body.trim()
        : m.media_type === "video"
          ? "[Video]"
          : m.media_type === "image"
            ? "[Photo]"
            : "";

      const existing = byOther.get(otherId);
      const isUnread = m.recipient_id === uid && !m.read;

      if (!existing) {
        byOther.set(otherId, {
          lastMessage: preview,
          lastMessageAt: m.created_at,
          unread: isUnread,
        });
      } else if (isUnread) {
        existing.unread = true;
      }
    }

    const otherIds = Array.from(byOther.keys());
    if (otherIds.length === 0) {
      setConversations([]);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .in("id", otherIds);

    const profileById = new Map(
      (profilesData ?? []).map((p) => [p.id, p as Profile])
    );

    const list: Conversation[] = otherIds.map((otherUserId) => {
      const entry = byOther.get(otherUserId)!;
      return {
        otherUserId,
        profile: profileById.get(otherUserId) ?? null,
        lastMessage: entry.lastMessage,
        lastMessageAt: entry.lastMessageAt,
        unread: entry.unread,
      };
    });

    list.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    setConversations(list);
  }

  async function loadLikes(uid: string) {
    const { data: myPosts } = await supabase
      .from("posts")
      .select("id, title")
      .eq("author_id", uid);

    const postTitleById = new Map((myPosts ?? []).map((p) => [p.id, p.title]));
    const myPostIds = (myPosts ?? []).map((p) => p.id);
    if (myPostIds.length === 0) {
      setLikeGroups([]);
      return;
    }

    const { data: likesData, error } = await supabase
      .from("post_likes")
      .select("post_id, created_at, profiles(username, avatar_url, is_admin)")
      .in("post_id", myPostIds)
      .neq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error || !likesData) {
      console.error("loadLikes failed", error);
      return;
    }

    const groups = new Map<
      string,
      { firstLiker: Profile | null; totalLikers: number; latestAt: string }
    >();

    for (const l of likesData as unknown as {
      post_id: string;
      created_at: string;
      profiles: Profile | null;
    }[]) {
      const existing = groups.get(l.post_id);
      if (!existing) {
        groups.set(l.post_id, {
          firstLiker: l.profiles,
          totalLikers: 1,
          latestAt: l.created_at,
        });
      } else {
        existing.totalLikers += 1;
      }
    }

    const list: LikeGroup[] = Array.from(groups.entries()).map(
      ([postId, g]) => ({
        postId,
        postTitle: postTitleById.get(postId) ?? "your post",
        firstLiker: g.firstLiker,
        totalLikers: g.totalLikers,
        latestAt: g.latestAt,
      })
    );
    list.sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
    setLikeGroups(list);
  }

  async function loadReplies(uid: string) {
    const { data: myPosts } = await supabase
      .from("posts")
      .select("id, title")
      .eq("author_id", uid);
    const postTitleById = new Map((myPosts ?? []).map((p) => [p.id, p.title]));
    const myPostIds = (myPosts ?? []).map((p) => p.id);

    const { data: myComments } = await supabase
      .from("comments")
      .select("id")
      .eq("author_id", uid);
    const myCommentIds = (myComments ?? []).map((c) => c.id);

    if (myPostIds.length === 0 && myCommentIds.length === 0) {
      setReplies([]);
      return;
    }

    const orParts: string[] = [];
    if (myPostIds.length > 0) orParts.push(`post_id.in.(${myPostIds.join(",")})`);
    if (myCommentIds.length > 0)
      orParts.push(`parent_comment_id.in.(${myCommentIds.join(",")})`);

    const { data, error } = await supabase
      .from("comments")
      .select(
        "id, body, created_at, post_id, profiles(username, avatar_url, is_admin)"
      )
      .neq("author_id", uid)
      .or(orParts.join(","))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error("loadReplies failed", error);
      return;
    }

    const list: ReplyItem[] = (
      data as unknown as {
        id: string;
        body: string;
        created_at: string;
        post_id: string;
        profiles: Profile | null;
      }[]
    ).map((r) => ({
      id: r.id,
      postId: r.post_id,
      postTitle: postTitleById.get(r.post_id) ?? "your post",
      body: r.body,
      createdAt: r.created_at,
      profile: r.profiles,
    }));
    setReplies(list);
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

      await Promise.all([
        loadConversations(user.id),
        loadLikes(user.id),
        loadReplies(user.id),
      ]);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    if ((next === "likes" || next === "replies") && userId) {
      markActivitySeen(supabase, userId);
    }
  }

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  const tabs: [Tab, string][] = [
    ["chats", "Chats"],
    ["replies", "Replies"],
    ["mentions", "Mentions"],
    ["likes", "Likes"],
  ];

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

        <h1 className="mb-4 text-2xl font-bold text-white">Messages</h1>

        <div className="mb-6 flex gap-2 border-b border-white/10 pb-3">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "chats" && (
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No conversations yet — visit someone&apos;s profile and hit
                &quot;Message&quot; to start one.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.otherUserId}
                  onClick={() => router.push(`/messages/${c.otherUserId}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3 text-left transition hover:border-white/25"
                >
                  {c.profile?.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                      {(c.profile?.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-white">
                        {c.profile?.username ?? "Someone"}
                      </p>
                      {c.profile?.is_admin && <AdminBadge />}
                    </div>
                    <p
                      className={`truncate text-xs ${
                        c.unread ? "font-semibold text-gray-200" : "text-gray-500"
                      }`}
                    >
                      {c.lastMessage}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-500">
                      {formatRelativeTime(c.lastMessageAt)}
                    </span>
                    {c.unread && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "likes" && (
          <div className="space-y-2">
            {likeGroups.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No likes yet — once someone likes your posts, they&apos;ll show up
                here.
              </p>
            ) : (
              likeGroups.map((g) => (
                <button
                  key={g.postId}
                  onClick={() => router.push(`/post/${g.postId}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3 text-left transition hover:border-white/25"
                >
                  {g.firstLiker?.avatar_url ? (
                    <img
                      src={g.firstLiker.avatar_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                      {(g.firstLiker?.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-200">
                      <span className="font-medium text-white">
                        {g.firstLiker?.username ?? "Someone"}
                      </span>
                      {g.totalLikers > 1
                        ? ` and ${g.totalLikers - 1} other${
                            g.totalLikers - 1 === 1 ? "" : "s"
                          } liked your post`
                        : " liked your post"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {g.postTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-500">
                    {formatRelativeTime(g.latestAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "replies" && (
          <div className="space-y-2">
            {replies.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No replies yet — replies to your posts or comments will show
                up here.
              </p>
            ) : (
              replies.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/post/${r.postId}`)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3 text-left transition hover:border-white/25"
                >
                  {r.profile?.avatar_url ? (
                    <img
                      src={r.profile.avatar_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                      {(r.profile?.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-white">
                        {r.profile?.username ?? "Someone"}
                      </p>
                      {r.profile?.is_admin && <AdminBadge />}
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {formatRelativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-300">{r.body}</p>
                    <p className="truncate text-[11px] text-gray-600">
                      on {r.postTitle}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "mentions" && (
          <p className="text-center text-sm text-gray-500">
            @mentions aren&apos;t tracked yet — coming later.
          </p>
        )}
      </div>
    </main>
  );
}
