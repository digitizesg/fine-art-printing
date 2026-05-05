-- Cache the source image's pixel dimensions on each artwork so the
-- shop product page doesn't have to <Image inferSize> at build time
-- (which fetches every artwork over the network on every Vercel deploy
-- to read its size). After running this, populate existing rows via
-- scripts/backfill-artwork-dimensions.mjs.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.artworks
  add column if not exists image_width  integer,
  add column if not exists image_height integer;
