-- Add gallery_images to artworks: a jsonb array of additional preview-image
-- filenames in the 'artworks' bucket. The hero stays in hero_image_path.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.artworks
  add column if not exists gallery_images jsonb not null default '[]'::jsonb;
