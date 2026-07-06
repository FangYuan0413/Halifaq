import { SupabaseClient } from "@supabase/supabase-js";

// Total unread count for the inbox envelope badge: unread DMs + likes/
// replies on your posts (or replies to your own comments) that happened
// after your "last seen" cursor. Likes/replies have no per-item read flag —
// anything newer than the cursor just counts as unread.
export async function getUnreadInboxCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count: dmCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("last_seen_activity_at")
    .eq("id", userId)
    .single();
  const since = profileRow?.last_seen_activity_at ?? new Date(0).toISOString();

  const { data: myPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", userId);
  const myPostIds = (myPosts ?? []).map((p) => p.id as string);

  const { data: myComments } = await supabase
    .from("comments")
    .select("id")
    .eq("author_id", userId);
  const myCommentIds = (myComments ?? []).map((c) => c.id as string);

  let likesCount = 0;
  if (myPostIds.length > 0) {
    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .in("post_id", myPostIds)
      .neq("user_id", userId)
      .gt("created_at", since);
    likesCount = count ?? 0;
  }

  let repliesCount = 0;
  if (myPostIds.length > 0 || myCommentIds.length > 0) {
    const orParts: string[] = [];
    if (myPostIds.length > 0) orParts.push(`post_id.in.(${myPostIds.join(",")})`);
    if (myCommentIds.length > 0)
      orParts.push(`parent_comment_id.in.(${myCommentIds.join(",")})`);

    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .neq("author_id", userId)
      .gt("created_at", since)
      .or(orParts.join(","));
    repliesCount = count ?? 0;
  }

  return (dmCount ?? 0) + likesCount + repliesCount;
}

// Marks the likes/replies feed as "seen" up to now — called when the user
// opens the Likes or Replies inbox tab.
export async function markActivitySeen(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("profiles")
    .update({ last_seen_activity_at: new Date().toISOString() })
    .eq("id", userId);
}
