-- Lets a post have multiple category tags instead of just one.
-- Run this once in the Supabase SQL Editor (safe to re-run).

create table if not exists public.post_categories (
  post_id uuid references public.posts(id) on delete cascade,
  category_id int references public.categories(id) on delete cascade,
  primary key (post_id, category_id)
);

alter table public.post_categories enable row level security;

drop policy if exists "Post categories are viewable by everyone" on public.post_categories;
create policy "Post categories are viewable by everyone" on public.post_categories
  for select using (true);

drop policy if exists "Authors can tag their own posts" on public.post_categories;
create policy "Authors can tag their own posts" on public.post_categories
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "Authors can remove tags from their own posts" on public.post_categories;
create policy "Authors can remove tags from their own posts" on public.post_categories
  for delete using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- Note: posts.category_id (the old single-category column) is no longer used
-- by the app going forward, but is left in place so nothing breaks.
