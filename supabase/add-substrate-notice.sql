-- Add an optional `notice` text column to papers and canvases.
-- Surfaces a small banner on the substrate detail page (and the
-- substrate showcase on print-on-paper / print-on-canvas) when the
-- admin wants to flag something to customers, e.g. "Once our current
-- stock is finished we will no longer carry this canvas."
--
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.papers
  add column if not exists notice text;

alter table public.canvases
  add column if not exists notice text;
