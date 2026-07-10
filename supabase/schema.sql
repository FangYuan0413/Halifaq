-- HalifaQ database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run

-- 1. Profiles: one row per user, linked to Supabase's built-in auth.users table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Automatically create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Categories: fixed list, seeded below
create table if not exists public.categories (
  id serial primary key,
  name text not null,
  slug text unique not null
);

insert into public.categories (name, slug) values
  ('Housing', 'housing'),
  ('Jobs & Work', 'jobs-work'),
  ('Visa & Immigration', 'visa-immigration'),
  ('Daily Life', 'daily-life'),
  ('Food', 'food'),
  ('Transportation', 'transportation'),
  ('Education', 'education'),
  ('Health', 'health'),
  ('Events', 'events'),
  ('General', 'general'),
  ('Music', 'music'),
  ('Sports', 'sports'),
  ('Tech', 'tech'),
  ('Politics', 'politics'),
  ('Gaming', 'gaming')
on conflict (slug) do nothing;

-- 3. Posts
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  category_id int references public.categories(id),
  title text not null,
  body text not null,
  image_url text,
  created_at timestamptz default now()
);

-- 4. Comments (replies)
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);

-- 5. Row Level Security: turn it on for every table
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- Profiles: everyone can view profiles; only the owner can edit their own
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Categories: read-only for everyone
drop policy if exists "Categories are viewable by everyone" on public.categories;
create policy "Categories are viewable by everyone" on public.categories
  for select using (true);

-- Posts: everyone can read; only signed-in users can create; only the author can edit/delete their own
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone" on public.posts
  for select using (true);
drop policy if exists "Signed-in users can create posts" on public.posts;
create policy "Signed-in users can create posts" on public.posts
  for insert with check (auth.uid() = author_id);
drop policy if exists "Authors can update their own posts" on public.posts;
create policy "Authors can update their own posts" on public.posts
  for update using (auth.uid() = author_id);
drop policy if exists "Authors can delete their own posts" on public.posts;
create policy "Authors can delete their own posts" on public.posts
  for delete using (auth.uid() = author_id);

-- Comments: same pattern as posts
drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Comments are viewable by everyone" on public.comments
  for select using (true);
drop policy if exists "Signed-in users can create comments" on public.comments;
create policy "Signed-in users can create comments" on public.comments
  for insert with check (auth.uid() = author_id);
drop policy if exists "Authors can update their own comments" on public.comments;
create policy "Authors can update their own comments" on public.comments
  for update using (auth.uid() = author_id);
drop policy if exists "Authors can delete their own comments" on public.comments;
create policy "Authors can delete their own comments" on public.comments
  for delete using (auth.uid() = author_id);
