-- Add paper_id to frame_examples so framed paper prints can be tagged with
-- the substrate (Hahnemühle Photo Rag, Bamboo, etc.).
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.frame_examples
  add column if not exists paper_id text;

create index if not exists frame_examples_paper_id_idx
  on public.frame_examples (paper_id) where paper_id is not null;
