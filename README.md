# HalifaQ

A RedNote-style Q&A platform for newcomers and international students in Halifax — CAS project.

**Live:** https://halifaq.netlify.app (deployed via Netlify, auto-redeploys on every `git push` to `main`)

## Run it locally

You'll need [Node.js](https://nodejs.org) (18+) installed on your computer.

1. Open a terminal in this `halifaq` folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the dev server:
   ```
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

## What's here so far

- `app/page.tsx` — landing page at `/`: HalifaQ heading, tagline, glowing background shapes, and "Log in" / "Sign up" buttons. Also detects the redirect after someone clicks their email confirmation link and shows a clear "Account confirmed" banner (or an error banner if the link expired).
- `app/login/page.tsx` and `app/signup/page.tsx` — routes that render the auth form (`components/AuthForm.tsx`), defaulting to the matching tab.
- `components/AuthForm.tsx` — a hero above the card shows the logo's icon mark large, with three water-ripple rings expanding outward from behind it on a loop; the toggle Log In / Sign Up form itself is wired to real Supabase auth (`supabase.auth.signInWithPassword` / `supabase.auth.signUp`), with error/info messages, and redirects to `/feed` on success.
- `app/feed/page.tsx` — the main feed at `/feed`, laid out as a 2-column waterfall grid (1 column on mobile) like RedNote/Pinterest. "All" / "Following" / "Hot" / "For You" tabs, live posts from Supabase. Each card (rendered by the shared `PostCard`) shows relative time ("2h ago"), reply count, view count, a "Trending" badge once a post crosses 50 views or 5 likes, and links to the post's detail page. Clicking a category in the sidebar (or the mobile pills) now navigates to that category's own page (`/category/[slug]`) instead of just filtering in place. Redirects to `/login` if you're not signed in.
- `components/PostCard.tsx` — the shared post-card UI (author, tags, trending badge, title/body with search-highlighting, media, like/reply/view counts, delete-if-yours-or-admin) used by the feed, category pages, and anywhere else a list of posts is rendered, so they can't visually drift apart. Admins additionally see a "Warn" button (opens a small modal to send the author a warning about that specific post) and can delete any post, not just their own.
- `utils/postDisplay.tsx` — shared helpers: `formatRelativeTime`, `highlightMatch`, `keywordRelevanceScore` (used by the `/search` results page), and the ranking math used by the Hot/For You tabs (see below).
- `utils/searchHistory.ts` — shared `localStorage` read/write/add/remove helpers for search history, used by both the feed's search dropdown and the `/search` page so they stay in sync.
- `app/category/[slug]/page.tsx` — a topic's dedicated page: its name, a view counter (bumped once per visit via `increment_category_views`), and every post tagged with it (a post with multiple tags shows up on every one of its categories' pages) in the same waterfall layout as the feed.
- `app/search/page.tsx` + `app/search/SearchResults.tsx` — pressing Enter in the feed's search box (or clicking a search-history term) collapses the dropdown, fires a "Searching…" toast, and lands here at `/search?q=...` instead of just filtering the feed in place. Every post is scored by `keywordRelevanceScore` (exact-phrase match in the title counts most, then in the body, then individual word overlap) and only posts that actually match (score > 0) are shown, ranked by that score first, then views, then likes as tie-breakers. A spinner (`components/Spinner.tsx`) shows while results load; no matches shows a plain "No related posts found" message instead of an empty grid. Has its own search box (Enter re-runs the search with a new `?q=`) and keeps the shared search history in sync. Split into a server wrapper (`page.tsx`) + client component (`SearchResults.tsx`) because `useSearchParams()` needs a Suspense boundary.
- `components/Spinner.tsx` — small loading indicator (a spinning ring on Dark/Light; a spinning `MikuChibi` on the Miku theme), used wherever a plain "Loading…" line isn't enough feedback.
- `app/post/[id]/page.tsx` — post detail page: full post, reply box (text plus up to 3 photos, with the same carousel/fullscreen/zoom viewer as posts), and the list of replies (comments), all pulled live from Supabase. Each top-level reply can itself be replied to (including replying to a nested reply) — nested replies show a "Reply to @username" tag, can also carry up to 3 photos, and are grouped under their thread's top-level reply. Only the first 2 nested replies show by default; past that, a "View N more replies" link expands the rest (and a "Collapse replies" link puts it back).
- `components/BackgroundShapes.tsx` — shared decorative background, used on every page. Dark/Light: glowing triangles/squares/circles drifting slowly. Miku: a few `MikuChibi` faces flying past instead (bigger, more diagonal motion than the plain float) — it watches `<html data-theme>` and the theme-change event live, so switching themes updates it without a reload.
- `components/ToastProvider.tsx` — global toast notifications (`useToast()` hook), wrapped around the whole app in `app/layout.tsx`. Shows a quick success or error pill (bottom of screen, auto-dismisses) whenever something meaningful succeeds or fails — posting, deleting a post, replying, uploading media/avatar (including "file too big"), and saving profile edits — so failures are never silent and successes get quick confirmation.
- `components/Logo.tsx` — the HalifaQ wordmark: a dynamic cyan "radar" mark (two counter-rotating arced rings + a pulsing center dot), "Halifa" in Dancing Script bold with a quick gradient shimmer sweeping through the letters every few seconds, and the "Q" glowing cyan with a small particle burst timed to land on it as the shimmer passes. Used on the landing page, feed sidebar/mobile header, and auth form so the brand looks consistent everywhere. (The handwritten-signature version is still in git history and in `public/signature-*.png` if you want to switch back.)
- `utils/supabase/client.ts` — creates the Supabase browser client using the keys in `.env.local`.
- `.env.local` — holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not committed to git — see `.gitignore`).
- `supabase/schema.sql` — the database schema (profiles, categories, posts, comments + RLS policies). Safe to re-run — every `create policy` has a matching `drop policy if exists` first.
- `supabase/backfill_profiles.sql` — one-time fix for accounts created before the auto-profile trigger existed.
- `supabase/media_setup.sql` — adds `media_url`/`media_type` columns to `posts`, creates the public `post-media` storage bucket, and sets its access policies.
- `supabase/add_categories.sql` — adds the Music/Sports/Tech/Politics categories (also folded into `schema.sql`'s seed list for fresh installs).
- `supabase/multi_tags.sql` — adds the `post_categories` join table so a post can carry multiple tags instead of one. `posts.category_id` is no longer used by the app.
- `supabase/post_views.sql` — adds a `views` counter to posts plus an `increment_post_views` function, called once each time someone opens a post's detail page.
- `supabase/social.sql` — adds `follows` (following/followers) and `post_likes` tables, with RLS.
- `supabase/avatars_setup.sql` — creates the public `avatars` storage bucket with per-user upload policies.
- `supabase/profile_fields.sql` — adds a `school` column to `profiles`.
- `supabase/post_media.sql` — adds the `post_media` table (post_id, url, media_type, position) so a post can carry up to 9 ordered photos, or one video, instead of a single `media_url`. Also migrates any existing single media into the new table.
- `supabase/comment_media.sql` — adds the `comment_media` table (comment_id, url, position) so a reply can carry up to 3 photos.
- `supabase/nested_replies.sql` — adds `parent_comment_id` (which top-level reply a nested reply belongs to) and `reply_to_username` (a snapshot of who it's aimed at, e.g. "Reply to @username") to `comments`.
- `supabase/category_views.sql` — adds a `views` counter to `categories` plus an `increment_category_views` function, bumped once each time someone opens that category's `/category/[slug]` page.
- `supabase/admin.sql` — adds `profiles.is_admin`, a `warnings` table (a warning an admin sends a user, optionally about a specific post), and updates the posts delete policy so admins can delete anyone's post, not just their own. Also grants admin to `lucasfan0413@gmail.com` (edit the email in the script to change who the admin is).
- `supabase/messages.sql` — adds the `messages` table (DMs: sender, recipient, optional text, optional photo/video, read flag) with RLS enforcing the 3-message cap for non-followers, a public `message-media` storage bucket, and `profiles.last_seen_activity_at` (the inbox's unread cursor).
- `supabase/theme.sql` — adds `profiles.theme` (`dark` | `light` | `miku`, defaults to `dark`).
- `components/DailyLifeMikuButton.tsx` — a one-off Miku-theme reskin of the "Daily Life" category link (sidebar and mobile pills): the wave/beach button art (`public/miku-daily-life-button.png`) at its own native proportions (`aspect-ratio` locked, no forced CSS shape — the PNG's corners are genuinely transparent, cut with ImageMagick, not just clipped), with a small chibi Miku badge (`public/miku-coconut.png`) standing at the top-right corner on a higher z-index so she overlaps the button rather than getting clipped by it, and a "Off to Daily Life~ 🌊" toast on click. Both images were AI-generated for this project (Midjourney) and had their backgrounds removed/cropped with ImageMagick. Only swapped in when the Miku theme is active; every other category stays a plain link.
- `components/EducationMikuButton.tsx` — the same one-off Miku-theme reskin pattern applied to the "Education" category link: a wooden bookshelf button (`public/miku-education-button.png`, real transparent corners) with a small chibi Miku (`public/miku-reading.png`) sitting cross-legged and reading right on the shelf's top ledge, centered and on a higher z-index than the button, plus a "Off to Education~ 📚" toast on click. Same AI-generated + ImageMagick-processed asset pipeline as Daily Life; only active under the Miku theme.
- `components/AdminBadge.tsx` — the small cyan "Admin" pill shown next to an admin's name wherever it appears (sidebar, profile header, post/reply bylines).
- `components/InboxIcon.tsx` — the envelope button (sidebar + mobile header) linking to `/messages`, with a red badge showing the unread count (unread DMs plus likes/replies since you last checked); polls every 30s so it doesn't go stale while the tab is open.
- `app/messages/page.tsx` — the inbox: Chats (your DM threads, newest first, unread ones bolded with a red dot), Likes (grouped per post — "X and N others liked your post" — click to open that post), Replies (comments/replies on your posts or your own comments, click to open that post), and Mentions (placeholder — @mentions aren't parsed/tracked anywhere yet). Opening Likes or Replies bumps `profiles.last_seen_activity_at`, which is what the inbox badge counts against.
- `app/messages/[userId]/page.tsx` — a single DM conversation: message history (text and/or one photo/video per message) in left/right bubbles, marks incoming messages read on open, and lets you send a new one. If you don't follow the other person, you're capped at 3 messages total to them until they follow you back (enforced both in the UI and by the database RLS policy).
- `utils/notifications.ts` — `getUnreadInboxCount` (DMs + likes + replies since your last-seen cursor) and `markActivitySeen` (bumps that cursor), shared by `InboxIcon` and the inbox page.
- `components/MediaCarousel.tsx` — renders a post's photo(s)/video; if there's more than one image, shows left/right arrows and a "2/5" counter so viewers can step through them. Clicking a photo opens it fullscreen (same arrow/counter, plus Esc, backdrop click, or the × button to close). While fullscreen, a bottom zoom bar (− button, slider, + button, live percentage) lets viewers dial in a zoom level directly; scroll wheel, double-click, and two-finger pinch (mobile) also zoom, and dragging pans around once zoomed in. Used in the feed, post detail, and profile pages.
- `app/profile/[id]/page.tsx` — profile / "personal space" page: avatar (click your own to upload a picture), username (with an Admin badge if applicable), school, bio, Following/Followers/Likes-received stats, a "Message" button + Follow/Unfollow button (hidden on your own profile — replaced by "Edit profile" and a "Theme" picker, own profile only), and a list of that user's posts.
- `app/layout.tsx` — shared page wrapper, dark (`bg-black`) base theme + site title/metadata.
- `app/icon.png`, `app/apple-icon.png` — the static favicon/site icon (Next.js's file-based convention picks these up automatically, no code needed): the same cyan radar mark from the logo, on a black rounded badge. We tried an animated JS-driven favicon first, but a real browser tab renders favicons at ~16px and can't reliably refresh faster than ~10-30x/second no matter what — pushing for 120fps wasn't realistic, so this is a clean static icon instead.
- `app/globals.css` — Tailwind setup + the `float-1` through `float-5` keyframe animations used by `BackgroundShapes`.
- `utils/theme.ts` — the `Theme` type (`"dark" | "light" | "miku"`), `applyTheme` (sets `<html data-theme>` + caches to `localStorage`), and `getCachedTheme`.
- `components/ThemeApplier.tsx` — mounted once in `app/layout.tsx`; reconciles the signed-in user's saved `profiles.theme` with whatever the no-flash inline script in `<head>` already applied from `localStorage`.
- `components/MikuChibi.tsx` — a chibi Miku face redesigned from reference art (bold dark outlines, glossy almond eyes with a highlight + sparkle, a tapered flowing ponytail shape, a small cowlick) used by the Miku theme in place of the abstract background shapes, as the Miku-theme loading spinner, on the feed's "new post" button, and in place of the ♥ on a liked post.
- `utils/useTheme.ts` — a `useTheme()` hook (current theme, updates live off the `halifaq-theme-change` event) for anything that needs to swap content per theme beyond what CSS overrides can do — currently used by the feed's "new post" FAB, which shows `MikuChibi` instead of a plain `+` on the Miku theme.

## Supabase setup (already done, for reference)

1. `npm install` pulls in `@supabase/supabase-js` and `@supabase/ssr`.
2. In the Supabase dashboard: **Authentication → Providers → Email**, the "Confirm email" toggle is off for development so signing up logs you in immediately. Turn it back on before real users sign up.
3. Run once, in order: `supabase/schema.sql`, `supabase/media_setup.sql`, `supabase/add_categories.sql`, `supabase/multi_tags.sql`, `supabase/post_views.sql`, `supabase/social.sql`, `supabase/avatars_setup.sql`, `supabase/profile_fields.sql`, `supabase/post_media.sql`, `supabase/comment_media.sql`, `supabase/nested_replies.sql`, `supabase/category_views.sql`, `supabase/admin.sql`, `supabase/messages.sql`, `supabase/theme.sql`.

## Features so far

Sign up / log in, post a question (required title, optional body text — line breaks from pressing Enter are preserved wherever it's displayed — optional up to 9 photos you can reorder before posting, or one video) tagged with multiple categories, like posts, follow other users, see each post/reply author's avatar (or an initial-letter placeholder if they haven't set one) next to their name, search by keyword, click a category to open its own topic page (view-counted, shows every post tagged with it), browse the feed's Hot tab (ranked by an engagement-vs-age "hot" score) or For You tab (ranked by how well a post's tags/keywords match what you've liked before), open a post to read/write replies (replies can carry up to 3 photos too, and can be replied to directly — tagged "Reply to @username", with the thread collapsing after 2 nested replies), delete your own posts, view and edit your profile (username, school, bio, avatar — all public) and see anyone's profile (their stats + their posts) by clicking their name or your own profile card in the sidebar. Focusing the search bar shows a dropdown: with no text typed it's "Popular searches" (categories ranked by total post views, needs 200+ combined views to qualify); once you type, it shows two side-by-side columns — matching "People" (click to jump to their profile) and matching "Posts" (click to open) — while the full feed list below also filters to the same keyword. Search is case-insensitive everywhere, and the matched keyword is highlighted in yellow within post titles/bodies so it's clear why each post matched. The search dropdown also has a "Filter by tag" row (every category, multi-select) so you can combine a keyword with one or more tags without leaving the search box — picking a tag there doesn't close the dropdown, and any active tag filters also show as removable chips just under the search bar. Pressing Enter in the search box (with something typed) saves that term to a "Search history" section shown above Popular searches, then jumps to the dedicated `/search` results page — each past search is a removable chip (click the term to search it again, click × to remove just that one, or "Clear" to wipe all of it); past 10 entries it collapses behind a "Show more" toggle. History is stored per-browser (`localStorage`), not on the server.

## Ranking & recommendation algorithms

Both run entirely client-side in `utils/postDisplay.tsx`, over the posts already loaded for the feed — no extra Supabase calls.

- **Hot tab** — `hotScore(post) = (views×1 + likes×5 + comments×4) / (ageInHours + 2)^1.3`. Likes and comments count for more than raw views since they're stronger signals of real engagement, and dividing by an age-based "gravity" term (same shape as the classic Hacker News ranking formula) means a fresh post with modest engagement can outrank an old post that racked up views long ago — engagement has to keep up with a post's age to stay on top.
- **For You tab** — builds a lightweight taste profile from the posts you've liked: which category tags keep showing up (`tagWeights`), and which non-generic words (>3 letters, common stopwords like "with"/"about" excluded) keep showing up in their titles/bodies (`keywordWeights`). Every other post is then scored by `forYouScore = Σ(tag match × 3) + Σ(keyword match × 1)` — tag matches count for more since they're an explicit signal, keyword matches add a lighter-touch nudge toward similar topics. Posts are sorted by that score, falling back to the Hot score as a tie-breaker (and as the entire ranking for someone who hasn't liked anything yet, since their profile is empty).
- **`/search` results** — `keywordRelevanceScore(post, query) = (title has exact phrase? +10) + (body has exact phrase? +4) + Σ(title has word? +3) + Σ(body has word? +1)`, computed per post against the searched query. Posts scoring 0 (no overlap at all) are dropped entirely rather than shown as weak matches; the rest are sorted by that score, then views, then likes.

## Messaging & notifications

An envelope icon (sidebar + mobile header) opens `/messages`, with a red badge for anything unread:

- **Chats** — direct messages between two users, with photo/video attachments. Anyone can message someone they follow; if the other person doesn't follow you back, you're limited to 3 messages total to them (both a UI warning and a hard database rule) so strangers can say hello without being able to spam.
- **Likes** — grouped per post ("Alex and 13 others liked your post"), click through to the post.
- **Replies** — comments/replies on your posts (or replies to your own comments), click through to the post.
- **Mentions** — placeholder tab; @mentions aren't parsed or tracked anywhere in the app yet.

## Moderation

`profiles.is_admin` marks an account as an admin (granted via `supabase/admin.sql`, currently `lucasfan0413@gmail.com`). Admins get two extra powers, both surfaced directly on `PostCard` and the post detail page:

An admin's name also carries a small cyan **Admin** badge (`components/AdminBadge.tsx`) everywhere it appears — the sidebar, their own profile header, and next to their name on any post or reply — so it's clear at a glance who has moderation authority.

- **Delete any post** — the "Delete" button shows on every post for an admin, not just their own.
- **Send a warning** — a "Warn" button (hidden on your own posts) opens a modal to write a message; it's saved to the `warnings` table tied to that post's author. Next time the warned user loads the feed, a blocking modal lists every unread warning (with the post it was about) and requires clicking "I understand" before it's marked read and dismissed.

## Color themes

Three themes — Dark (default), Light, and Miku (Hatsune Miku's signature teal, `#39C5BB`) — picked from a "Theme" section on your own profile page, saved to `profiles.theme`, and applied instantly.

Rather than rewriting every component's color classes, alternate themes work by re-targeting the exact compiled Tailwind class names (`bg-black`, `text-white`, `bg-neutral-900`, `border-white/10`, the `text-gray-100`–`600` scale, etc.) underneath a `[data-theme="..."]` selector in `app/globals.css` — see the "Color themes" section there for the full rule set. This keeps every page's actual markup untouched; only the CSS changes. Two things are intentionally left alone in every theme: modal backdrops / overlay buttons that use black at partial opacity (e.g. `bg-black/70`) stay dark regardless of theme, since dimming the background is a theme-agnostic pattern; and the soft glow shadows on cards (the `shadow-[...rgba(255,255,255,...)]` arbitrary values) don't retint, so they're barely visible outside the Dark theme — a minor cosmetic trade-off for not having to touch every file.

A tiny inline script in `<head>` (`app/layout.tsx`) applies whatever theme is cached in `localStorage` before the page paints, so switching pages or reloading doesn't flash the default Dark theme first.

Miku's palette is a dark, teal-tinted charcoal (`#12181a` page / `#1c2b29` cards) rather than pure black, keeps the app's existing cyan accents (they already read as "Miku teal"), and swaps hearts/likes to her signature pink (`#ff5fa8`) instead of red. `applyTheme()` also fires a `halifaq-theme-change` window event, which `BackgroundShapes` and `Spinner` listen for so they can swap in their `MikuChibi` bits immediately when you change themes, without a page reload.

A few brand/accent colors (the logo's cyan "Q" and particle burst, the "Halifa" shimmer gradient, the spinner's active segment) were tuned to glow on a dark page and read as almost invisible once Light made the page itself white — these get their own `[data-theme="light"]` overrides in `globals.css` (a darker cyan, a dark-toned gradient, a dark spinner accent) rather than staying pale-on-pale.

## Design system

Dark theme: black background, white text, `neutral-900` cards with subtle white/10 borders, white-fill or white-outline buttons. Background shapes come from the shared `BackgroundShapes` component — don't rebuild them per-page.

## Next step

Consider: a "protected route" middleware so pages check auth server-side instead of each client component redirecting after the fact; pagination/infinite scroll once the feed has many posts; notifications when someone replies to or likes your post.
