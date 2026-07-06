-- Lets a reply be aimed at another comment/reply (not just the post itself),
-- so replies can nest under the top-level comment they belong to. Run once
-- in the Supabase SQL Editor (safe to re-run).

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

-- Snapshot of who a reply is aimed at, e.g. "Reply to @username" — stored at
-- the time of posting rather than looked up live, so it stays correct even
-- if that person later renames themselves.
alter table public.comments
  add column if not exists reply_to_username text;

create index if not exists comments_parent_comment_id_idx
  on public.comments(parent_comment_id);

-- No new RLS policies needed: the existing "Signed-in users can create
-- comments" / "Comments are viewable by everyone" policies on public.comments
-- already cover these new columns.
