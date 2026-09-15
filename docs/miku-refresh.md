# Miku clarity and interaction refresh

The earlier implementation positioned cropped UI screenshots above the feed and overlaid invisible links. The replacement renders readable text, SVG icons, actual links/buttons, and contained character artwork. Search, banner, composer, and the category rail are in document flow. Only desktop navigation stays at the viewport edge. Button artwork is part of the clickable element with no independently positioned hit regions.

## Artwork

Generated with the built-in imagegen tool using the existing banner and thumbnail as edit references. The illustration retains the original harbour/Miku composition but is an AI restoration, not a pixel-identical upscale.

- `public/miku-theme/harbour-2k.png`: 2157 × 729 RGB. Prompt: restore the original banner in crisp 2K detail, preserving character, pose, palette, harbour, bridge, and wording; remove the cropped search-field remnant.
- `public/miku-theme/portrait-hd.png`: 1254 × 1254 RGBA. Prompt: restore the Miku button portrait with detailed anime linework, complete head and headphones, teal twin-tails, matching palette, and genuine transparency; no text or button frame.

Next Image serves responsive sizes. Text and icons are code-rendered so their clarity does not depend on raster resolution. The old low-resolution crops are no longer referenced by the dashboard.

## Controls

- Home resets filters; Explore opens search; Categories focuses the live category rail.
- Messages opens the existing inbox with username search to start a conversation, visible loading/error states, and periodic refresh. No test messages were sent to real people.
- Notifications opens Replies; Likes remains available in the inbox.
- Profile opens the signed-in user's profile. Theme controls update the local appearance and save the account preference.
- Bookmarks adds/removes post IDs in per-user browser storage and filters the feed. These bookmarks are device-local, explicitly labeled in the UI.
- Text, Photo, Link and Post open the existing composer. Photo exposes the attachment picker and Link gives an appropriate prompt. Decorative Poll and unimplemented Mentions tabs were removed; no voting or mentions tracking is claimed.

## Verification

TypeScript, production compilation, and static generation pass. Existing image optimization lint warnings remain in unrelated legacy image components. Corrected the package lock so clean npm installs can resolve the already-declared dependencies.

Supabase read-only checks confirmed the category slugs, message columns, and existing participant policies. No database schema or access policy changed. Browser testing of the local server was blocked by this environment; the hosted preview requires sign-in, so signed-in flows and scroll geometry still need a browser check with an authorized session.
