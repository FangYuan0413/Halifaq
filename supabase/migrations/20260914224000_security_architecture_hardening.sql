-- Halifaq security and schema hardening.
-- This migration mirrors the non-breaking production fixes applied on 2026-09-14
-- and includes the final private-DM-media cutover that should be deployed together
-- with the matching frontend change.

-- Repair schema drift: the app reads has_seen_tour.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'has_seen_tour'
  ) then
    alter table public.profiles add column has_seen_tour boolean not null default false;
    update public.profiles set has_seen_tour = true;
  end if;
end $$;

-- Store private message-media object paths rather than public URLs.
alter table public.messages add column if not exists media_path text;
update public.messages
set media_path = split_part(media_url, '/object/public/message-media/', 2)
where media_path is null
  and media_url like '%/object/public/message-media/%';

-- Harden signup trigger: fixed search_path, collision-safe usernames, and no API execution.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  if base_username is null then
    base_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if base_username is null then
    base_username := 'user';
  end if;

  base_username := left(base_username, 30);
  candidate := base_username;

  loop
    begin
      insert into public.profiles (id, username) values (new.id, candidate);
      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      candidate := left(base_username, greatest(1, 30 - length(suffix::text) - 1)) || '_' || suffix::text;
    end;
  end loop;

  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- View-count RPCs are signed-in-only and use a fixed search_path.
create or replace function public.increment_post_views(post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.posts set views = views + 1 where id = post_id;
end;
$$;
revoke all on function public.increment_post_views(uuid) from public, anon;
grant execute on function public.increment_post_views(uuid) to authenticated;

create or replace function public.increment_category_views(category_id integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.categories set views = views + 1 where id = category_id;
end;
$$;
revoke all on function public.increment_category_views(integer) from public, anon;
grant execute on function public.increment_category_views(integer) to authenticated;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- RLS performance and ownership immutability.
alter policy "Users can update their own profile" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "Signed-in users can create posts" on public.posts
  with check ((select auth.uid()) = author_id);
alter policy "Authors can update their own posts" on public.posts
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
alter policy "Authors or admins can delete posts" on public.posts
  using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

alter policy "Signed-in users can create comments" on public.comments
  with check ((select auth.uid()) = author_id);
alter policy "Authors can update their own comments" on public.comments
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
alter policy "Authors can delete their own comments" on public.comments
  using ((select auth.uid()) = author_id);

alter policy "Users can follow others" on public.follows
  with check ((select auth.uid()) = follower_id);
alter policy "Users can unfollow" on public.follows
  using ((select auth.uid()) = follower_id);

alter policy "Users can like posts" on public.post_likes
  with check ((select auth.uid()) = user_id);
alter policy "Users can unlike posts" on public.post_likes
  using ((select auth.uid()) = user_id);

alter policy "Authors can tag their own posts" on public.post_categories
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  ));
alter policy "Authors can remove tags from their own posts" on public.post_categories
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  ));

alter policy "Authors can attach media to their own posts" on public.post_media
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  ));
alter policy "Authors can remove media from their own posts" on public.post_media
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  ));

alter policy "Authors can attach media to their own replies" on public.comment_media
  with check (exists (
    select 1 from public.comments c
    where c.id = comment_id and c.author_id = (select auth.uid())
  ));
alter policy "Authors can remove media from their own replies" on public.comment_media
  using (exists (
    select 1 from public.comments c
    where c.id = comment_id and c.author_id = (select auth.uid())
  ));

alter policy "Users can view their own warnings" on public.warnings
  using ((select auth.uid()) = user_id);
alter policy "Admins can issue warnings" on public.warnings
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin = true
  ));
alter policy "Users can mark their own warnings as read" on public.warnings
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Participants can view their messages" on public.messages
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
alter policy "Users can send messages, non-followers limited to 3" on public.messages
  with check (
    (select auth.uid()) = sender_id
    and sender_id <> recipient_id
    and (
      exists (
        select 1 from public.follows f
        where f.follower_id = sender_id and f.following_id = recipient_id
      )
      or (
        select count(*) from public.messages m
        where m.sender_id = (select auth.uid()) and m.recipient_id = messages.recipient_id
      ) < 3
    )
  );
alter policy "Recipients can mark messages read" on public.messages
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Storage ownership restrictions.
drop policy if exists "Signed-in users can upload post media" on storage.objects;
drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Users can upload their own post media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Signed-in users can upload message media" on storage.objects;
drop policy if exists "Users can upload their own message media" on storage.objects;
create policy "Users can upload their own message media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own message media" on storage.objects;
create policy "Users can delete their own message media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'message-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Private DM-media cutover. Signed URLs work because message participants can
-- read the underlying objects; the first folder is the sender id.
update storage.buckets set public = false where id = 'message-media';
drop policy if exists "Public can view message media" on storage.objects;
drop policy if exists "Message participants can view message media" on storage.objects;
create policy "Message participants can view message media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.messages m
      where m.media_path = storage.objects.name
        and ((select auth.uid()) = m.sender_id or (select auth.uid()) = m.recipient_id)
    )
  );

-- Column-level grants prevent users from changing privileged identity/admin fields.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_url, bio, school, last_seen_activity_at, theme, has_seen_tour)
  on public.profiles to authenticated;

revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant update (read) on public.messages to authenticated;

revoke all on public.warnings from anon, authenticated;
grant select, insert on public.warnings to authenticated;
grant update (read) on public.warnings to authenticated;

-- Explicit Data API grants for public-content tables.
grant select on public.categories, public.posts, public.comments, public.follows,
  public.post_likes, public.post_categories, public.post_media, public.comment_media
  to anon, authenticated;
grant insert on public.posts, public.comments, public.follows, public.post_likes,
  public.post_categories, public.post_media, public.comment_media
  to authenticated;
grant delete on public.posts, public.comments, public.follows, public.post_likes,
  public.post_categories, public.post_media, public.comment_media
  to authenticated;
grant update (title, body, category_id, image_url, media_url, media_type)
  on public.posts to authenticated;
grant update (body) on public.comments to authenticated;

-- Cover foreign keys and common lookup paths.
create index if not exists comment_media_comment_id_idx on public.comment_media(comment_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists post_categories_category_id_idx on public.post_categories(category_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);
create index if not exists post_media_post_id_idx on public.post_media(post_id);
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_category_id_idx on public.posts(category_id);
create index if not exists warnings_issued_by_idx on public.warnings(issued_by);
create index if not exists warnings_user_id_idx on public.warnings(user_id);
