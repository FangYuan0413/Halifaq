-- Lets a post carry multiple ordered images (up to 9) instead of just one
-- photo/video. Run this once in the Supabase SQL Editor (safe to re-run).

create table if not exists public.post_media (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position int not null default 0
);

alter table public.post_media enable row level security;

drop policy if exists "Post media is viewable by everyone" on public.post_media;
create policy "Post media is viewable by everyone" on public.post_media
  for select using (true);

drop policy if exists "Authors can attach media to their own posts" on public.post_media;
create policy "Authors can attach media to their own posts" on public.post_media
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "Authors can remove media from their own posts" on public.post_media;
create policy "Authors can remove media from their own posts" on public.post_media
  for delete using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- One-time migration: copy any existing single media_url/media_type into
-- the new table so old posts don't lose their photo/video. Safe to re-run —
-- skips posts that already have a post_media row.
insert into public.post_media (post_id, url, media_type, position)
select p.id, p.media_url, p.media_type, 0
from public.posts p
where p.media_url is not null
  and not exists (
    select 1 from public.post_media pm where pm.post_id = p.id
  );

-- Note: posts.media_url / posts.media_type are no longer written to by the
-- app going forward, but are left in place so nothing breaks.
