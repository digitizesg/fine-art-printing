-- Cache of every review pulled from the Google Business Profile API.
-- The public Places API only returns 5 reviews, but the OAuth-authed
-- Business Profile API returns the full list. Ben hits "Refresh from
-- Google" in /admin/featured-reviews to populate this table, then features
-- any of them onto the testimonial wall.
--
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

create table if not exists public.google_business_reviews (
  review_id          text primary key,
  author_name        text not null,
  profile_photo_url  text,
  rating             int not null check (rating between 1 and 5),
  body               text not null default '',
  create_time        timestamptz not null,
  fetched_at         timestamptz not null default now()
);

create index if not exists google_business_reviews_create_time_idx
  on public.google_business_reviews (create_time desc);
create index if not exists google_business_reviews_rating_idx
  on public.google_business_reviews (rating);

-- =========================================================================
-- RLS: admin-only. The public site never reads this table; the
-- featured_reviews table (curated subset) is what the marketing site sees.
-- =========================================================================

alter table public.google_business_reviews enable row level security;

drop policy if exists "Authenticated full access google_business_reviews"
  on public.google_business_reviews;
create policy "Authenticated full access google_business_reviews"
  on public.google_business_reviews for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
