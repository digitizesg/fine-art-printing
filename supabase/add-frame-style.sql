-- Add frame_style to frame_examples so the gallery can offer a
-- "framing style" filter (standard / shadow-box / float-mount /
-- mat-bordered). Only meaningful when service = 'custom-framing'.
-- Existing rows are left null so no retroactive tagging is needed.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.frame_examples
  add column if not exists frame_style text
  check (
    frame_style is null or
    frame_style in ('standard', 'shadow-box', 'float-mount', 'mat-bordered')
  );

create index if not exists frame_examples_frame_style_idx
  on public.frame_examples (frame_style) where frame_style is not null;
