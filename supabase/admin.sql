-- Admin/moderation: lets an admin account delete anyone's post and send a
-- warning to a user. Run once in the Supabase SQL Editor (safe to re-run).

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Warnings sent by an admin to a user, optionally about a specific post.
-- post_title is a snapshot (kept even if the post itself gets deleted).
create table if not exists public.warnings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  issued_by uuid references public.profiles(id) on delete set null,
  post_title text,
  message text not null,
  created_at timestamptz default now(),
  read boolean not null default false
);

alter table public.warnings enable row level security;

drop policy if exists "Users can view their own warnings" on public.warnings;
create policy "Users can view their own warnings" on public.warnings
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can issue warnings" on public.warnings;
create policy "Admins can issue warnings" on public.warnings
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Users can mark their own warnings as read" on public.warnings;
create policy "Users can mark their own warnings as read" on public.warnings
  for update using (auth.uid() = user_id);

-- Posts: authors can still delete their own, and now admins can delete anyone's.
drop policy if exists "Authors can delete their own posts" on public.posts;
drop policy if exists "Authors or admins can delete posts" on public.posts;
create policy "Authors or admins can delete posts" on public.posts
  for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Grant admin to this account. Change the email if you want a different
-- account to be the admin instead.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'lucasfan0413@gmail.com');
