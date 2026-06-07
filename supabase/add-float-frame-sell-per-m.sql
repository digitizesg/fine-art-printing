-- Switch float-frame pricing to a direct customer sell price per metre.
--
-- The moulding charge is now perimeter (m) × sell_per_m, with no markup/wastage
-- (the fitting labour stays a separate component). The old cost_per_foot column
-- is kept for reference but is no longer read or written by the app.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.float_frames
  add column if not exists sell_per_m numeric(8,2) not null default 0;

-- The app no longer writes cost_per_foot, so drop its NOT NULL constraint or
-- inserting a new float frame would fail. Column retained for history.
alter table public.float_frames
  alter column cost_per_foot drop not null;
