-- Adds an optional `popular` flag to papers + canvases so admins can
-- highlight a subset of the featured catalogue with a "Popular" badge on
-- the discovery pages (print-on-paper, canvas-printing). Default false
-- preserves the current UI for everything else.

alter table public.papers
  add column if not exists popular boolean not null default false;

alter table public.canvases
  add column if not exists popular boolean not null default false;

create index if not exists papers_popular_idx
  on public.papers (popular) where popular = true;

create index if not exists canvases_popular_idx
  on public.canvases (popular) where popular = true;
