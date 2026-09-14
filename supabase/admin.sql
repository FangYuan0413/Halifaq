-- Admin/moderation bootstrap.
-- Legacy bootstrap script. New schema changes should go in supabase/migrations/.
-- IMPORTANT: this file intentionally does not promote any specific account.
-- Grant admin status as a deliberate trusted administrative operation.

alter table public.profiles add column if not exists is_admin boolean not null default false;

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
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Admins can issue warnings" on public.warnings;
create policy "Admins can issue warnings" on public.warnings
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

drop policy if exists "Users can mark their own warnings as read" on public.warnings;
create policy "Users can mark their own warnings as read" on public.warnings
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Authors can delete their own posts" on public.posts;
drop policy if exists "Authors or admins can delete posts" on public.posts;
create policy "Authors or admins can delete posts" on public.posts
  for delete using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- Example trusted one-off operation (run manually with an authenticated
-- database administrator, never bake an email address into source control):
-- update public.profiles set is_admin = true where id = '<trusted-user-uuid>';
