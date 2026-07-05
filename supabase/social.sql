-- Adds following/followers and post likes.
-- Safe to re-run.

-- Follows: follower_id follows following_id
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone" on public.follows
  for select using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others" on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);

-- Post likes
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Likes are viewable by everyone" on public.post_likes;
create policy "Likes are viewable by everyone" on public.post_likes
  for select using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts" on public.post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can unlike posts" on public.post_likes;
create policy "Users can unlike posts" on public.post_likes
  for delete using (auth.uid() = user_id);
