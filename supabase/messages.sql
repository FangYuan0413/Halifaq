-- Direct messages (DMs) between two users, plus a shared "last seen" cursor
-- on profiles used to compute unread counts for the likes/replies inbox
-- tabs (post_likes/comments already have created_at, so no read flag is
-- needed there — anything newer than the cursor counts as unread).
-- Run once in the Supabase SQL Editor (safe to re-run).

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  body text,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz default now(),
  read boolean not null default false
);

create index if not exists messages_sender_recipient_idx
  on public.messages(sender_id, recipient_id);
create index if not exists messages_recipient_sender_idx
  on public.messages(recipient_id, sender_id);

alter table public.messages enable row level security;

drop policy if exists "Participants can view their messages" on public.messages;
create policy "Participants can view their messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Anyone can message someone they follow. If they don't follow the
-- recipient, they're capped at 3 total messages to that person — enough to
-- say hello without letting strangers flood someone's inbox.
drop policy if exists "Users can send messages, non-followers limited to 3" on public.messages;
create policy "Users can send messages, non-followers limited to 3" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and (
      exists (
        select 1 from public.follows f
        where f.follower_id = sender_id and f.following_id = recipient_id
      )
      or (
        select count(*) from public.messages m
        where m.sender_id = auth.uid() and m.recipient_id = messages.recipient_id
      ) < 3
    )
  );

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read" on public.messages
  for update using (auth.uid() = recipient_id);

-- Storage bucket for message photo/video attachments.
insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view message media" on storage.objects;
create policy "Public can view message media" on storage.objects
  for select using (bucket_id = 'message-media');

drop policy if exists "Signed-in users can upload message media" on storage.objects;
create policy "Signed-in users can upload message media" on storage.objects
  for insert with check (bucket_id = 'message-media' and auth.role() = 'authenticated');

-- Cursor: anything (likes/replies on your posts) created after this
-- timestamp counts as "unread" in the inbox. Bumped to now() whenever the
-- user opens the Likes or Replies tab.
alter table public.profiles
  add column if not exists last_seen_activity_at timestamptz not null default now();
