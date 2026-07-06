-- Lets a reply/comment carry up to 3 ordered photos. Run this once in the
-- Supabase SQL Editor (safe to re-run).

create table if not exists public.comment_media (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.comments(id) on delete cascade not null,
  url text not null,
  position int not null default 0
);

alter table public.comment_media enable row level security;

drop policy if exists "Comment media is viewable by everyone" on public.comment_media;
create policy "Comment media is viewable by everyone" on public.comment_media
  for select using (true);

drop policy if exists "Authors can attach media to their own replies" on public.comment_media;
create policy "Authors can attach media to their own replies" on public.comment_media
  for insert with check (
    exists (
      select 1 from public.comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );

drop policy if exists "Authors can remove media from their own replies" on public.comment_media;
create policy "Authors can remove media from their own replies" on public.comment_media
  for delete using (
    exists (
      select 1 from public.comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );
