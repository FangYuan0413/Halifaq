"use client";

import { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import { useToast } from "@/components/ToastProvider";

type Tag = { id: number; name: string };

type ProfileInfo = {
  id: string;
  username: string;
  bio: string | null;
  school: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  tags: Tag[];
  likeCount: number;
};

type RawPost = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  post_categories: { categories: Tag | null }[] | null;
  post_likes: { user_id: string }[] | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isOwnProfile = currentUserId === profileId;
  const likesReceived = posts.reduce((sum, p) => sum + p.likeCount, 0);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);
      setLoadingAuth(false);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, bio, school, avatar_url")
        .eq("id", profileId)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        return;
      }
      setProfile(profileData);
      setEditUsername(profileData.username ?? "");
      setEditSchool(profileData.school ?? "");
      setEditBio(profileData.bio ?? "");

      const { data: postsData } = await supabase
        .from("posts")
        .select(
          "id, title, body, created_at, media_url, media_type, post_categories(categories(id, name)), post_likes(user_id)"
        )
        .eq("author_id", profileId)
        .order("created_at", { ascending: false });

      const withExtras = ((postsData ?? []) as unknown as RawPost[]).map(
        (p) => ({
          ...p,
          tags: (p.post_categories ?? [])
            .map((pc) => pc.categories)
            .filter((c): c is Tag => c !== null),
          likeCount: (p.post_likes ?? []).length,
        })
      );
      setPosts(withExtras);

      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);
      setFollowerCount(followers ?? 0);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);
      setFollowingCount(following ?? 0);

      if (user.id !== profileId) {
        const { data: existingFollow } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", profileId)
          .maybeSingle();
        setIsFollowing(!!existingFollow);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId || !isOwnProfile) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Upload failed — image is over 5MB.", "error");
      return;
    }

    setUploadingAvatar(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${currentUserId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      showToast(`Upload failed — ${uploadError.message}`, "error");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    // Cache-bust so the browser doesn't keep showing the old image at the
    // same URL after an overwrite.
    const versionedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: versionedUrl })
      .eq("id", currentUserId);

    setProfile((prev) => (prev ? { ...prev, avatar_url: versionedUrl } : prev));
    setUploadingAvatar(false);
    showToast("Avatar updated!");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !profile) return;

    const trimmedUsername = editUsername.trim();
    if (!trimmedUsername) {
      setEditError("Username can't be empty.");
      return;
    }

    setSavingProfile(true);
    setEditError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: trimmedUsername,
        school: editSchool.trim() || null,
        bio: editBio.trim() || null,
      })
      .eq("id", currentUserId);

    setSavingProfile(false);

    if (error) {
      // Username has a unique constraint, so a taken name shows up here.
      const message = error.message.includes("duplicate")
        ? "That username is already taken."
        : error.message;
      setEditError(message);
      showToast(`Couldn't save profile — ${message}`, "error");
      return;
    }

    setProfile({
      ...profile,
      username: trimmedUsername,
      school: editSchool.trim() || null,
      bio: editBio.trim() || null,
    });
    setShowEditModal(false);
    showToast("Profile updated!");
  }

  async function toggleFollow() {
    if (!currentUserId || followBusy) return;
    setFollowBusy(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profileId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }

    setFollowBusy(false);
  }

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-center">
        <p className="text-sm text-gray-500">This user doesn&apos;t exist.</p>
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

        {/* Profile header */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-4">
            <div
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
              className={`group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-2xl font-bold text-white ring-1 ring-white/20 ${
                isOwnProfile ? "cursor-pointer" : ""
              }`}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.username.slice(0, 1).toUpperCase()
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                  {uploadingAvatar ? "…" : "Edit"}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-white">
                {profile.username}
              </p>
              {profile.school && (
                <p className="mt-0.5 truncate text-sm text-gray-300">
                  {profile.school}
                </p>
              )}
              {profile.bio && (
                <p className="mt-0.5 truncate text-sm text-gray-400">
                  {profile.bio}
                </p>
              )}
            </div>
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Edit profile
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  isFollowing
                    ? "border border-white/20 text-white hover:bg-white/10"
                    : "bg-white text-black hover:opacity-90"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <div className="mt-5 flex gap-6 border-t border-white/10 pt-4 text-center">
            <div>
              <p className="text-base font-semibold text-white">
                {followingCount}
              </p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                {followerCount}
              </p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                {likesReceived}
              </p>
              <p className="text-xs text-gray-500">Likes received</p>
            </div>
          </div>
        </div>

        {/* Personal space: this user's posts */}
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Posts
        </p>
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              No posts yet.
            </p>
          )}
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="block rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_30px_rgba(255,255,255,0.04)] transition hover:border-white/25"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {post.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-gray-300"
                  >
                    {t.name}
                  </span>
                ))}
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span className="ml-auto text-gray-600">
                  ♥ {post.likeCount}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                {post.title}
              </p>
              {post.body && (
                <p className="mt-0.5 text-sm text-gray-200">{post.body}</p>
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
            </Link>
          ))}
        </div>
      </div>

      {/* Edit profile modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowEditModal(false)}
        >
          <form
            onSubmit={handleSaveProfile}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Edit profile</p>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400">
                  School
                </label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  placeholder="e.g. Dalhousie University"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Tell people a bit about yourself…"
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-600">
              This information is public — anyone can see it when they click
              your name.
            </p>

            {editError && (
              <p className="mt-2 text-xs text-red-400">{editError}</p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
