"use client";

import { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import AdminBadge from "@/components/AdminBadge";
import { useToast } from "@/components/ToastProvider";
import { formatRelativeTime } from "@/utils/postDisplay";

const MAX_MESSAGES_IF_NOT_FOLLOWED = 3;

type OtherProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin?: boolean;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  read: boolean;
};

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.userId as string;
  const supabase = createClient();
  const { showToast } = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [iFollowOther, setIFollowOther] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages(uid: string) {
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, sender_id, recipient_id, body, media_url, media_type, created_at, read"
      )
      .or(
        `and(sender_id.eq.${uid},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${uid})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("loadMessages failed", error);
      return;
    }

    setMessages(data ?? []);

    const unreadIds = (data ?? [])
      .filter((m) => m.recipient_id === uid && !m.read)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("messages").update({ read: true }).in("id", unreadIds);
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

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_admin")
        .eq("id", otherUserId)
        .single();

      if (error || !profileData) {
        setNotFound(true);
        return;
      }
      setOtherProfile(profileData);

      const { data: followRow } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", otherUserId)
        .maybeSingle();
      setIFollowOther(!!followRow);

      await loadMessages(user.id);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const video = file.type.startsWith("video");
    const maxSize = video ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(
        `Upload failed — file is over ${video ? "50MB" : "20MB"}.`,
        "error"
      );
      return;
    }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setIsVideo(video);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  const mySentCount = messages.filter((m) => m.sender_id === userId).length;
  const limitReached = !iFollowOther && mySentCount >= MAX_MESSAGES_IF_NOT_FOLLOWED;

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!userId || limitReached) return;
    if (!text.trim() && !mediaFile) return;

    setSending(true);

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("message-media")
        .upload(path, mediaFile);

      if (uploadError) {
        setSending(false);
        showToast(`Upload failed — ${uploadError.message}`, "error");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("message-media")
        .getPublicUrl(path);
      media_url = urlData.publicUrl;
      media_type = isVideo ? "video" : "image";
    }

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: otherUserId,
      body: text.trim() || null,
      media_url,
      media_type,
    });

    setSending(false);

    if (error) {
      showToast(`Couldn't send — ${error.message}`, "error");
      return;
    }

    setText("");
    clearMedia();
    await loadMessages(userId);
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
        <p className="text-sm text-gray-500">This user doesn&apos;t exist.</p>
        <Link
          href="/messages"
          className="text-sm text-white underline underline-offset-4"
        >
          Back to messages
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black px-4 py-8">
      <BackgroundShapes />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col">
        <Link
          href="/messages"
          className="mb-4 inline-block text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          &larr; Back to messages
        </Link>

        <Link
          href={`/profile/${otherUserId}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3 transition hover:border-white/25"
        >
          {otherProfile?.avatar_url ? (
            <img
              src={otherProfile.avatar_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
              {(otherProfile?.username ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            {otherProfile?.username ?? "Someone"}
            {otherProfile?.is_admin && <AdminBadge />}
          </span>
        </Link>

        <div className="flex-1 space-y-2 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <p className="mt-8 text-center text-sm text-gray-500">
              Say hello — this is the start of your conversation.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-white text-black"
                        : "border border-white/10 bg-neutral-900 text-gray-100"
                    }`}
                  >
                    {m.media_url &&
                      (m.media_type === "video" ? (
                        <video
                          src={m.media_url}
                          controls
                          className="mb-1 max-h-64 w-full rounded-lg"
                        />
                      ) : (
                        <img
                          src={m.media_url}
                          alt=""
                          className="mb-1 max-h-64 w-full rounded-lg object-cover"
                        />
                      ))}
                    {m.body && (
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    )}
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
                      {formatRelativeTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {limitReached && (
          <p className="mb-2 text-center text-xs text-amber-400">
            You&apos;ve sent {MAX_MESSAGES_IF_NOT_FOLLOWED} messages and{" "}
            {otherProfile?.username ?? "this user"} doesn&apos;t follow you
            yet — they&apos;ll need to follow you back before you can send more.
          </p>
        )}

        <form
          onSubmit={handleSend}
          className="rounded-2xl border border-white/10 bg-neutral-900 p-3"
        >
          {mediaPreview && (
            <div className="relative mb-2 inline-block h-20 w-20 overflow-hidden rounded-lg border border-white/10">
              {isVideo ? (
                <video src={mediaPreview} className="h-full w-full object-cover" />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Selected upload preview"
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={clearMedia}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white ring-1 ring-white/20"
              >
                ×
              </button>
            </div>
          )}
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
              disabled={limitReached || !!mediaFile}
              aria-label="Attach photo or video"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              +
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={limitReached ? "Message limit reached" : "Message…"}
              disabled={limitReached}
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={sending || limitReached || (!text.trim() && !mediaFile)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
