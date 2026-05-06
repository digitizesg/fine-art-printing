-- Allow kind = 'valuation' on the orders table so the new
-- /art-valuation/submit flow can persist its pending payment row.
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.orders
  drop constraint if exists orders_kind_check;

alter table public.orders
  add constraint orders_kind_check
  check (kind in ('shop', 'custom_payment', 'valuation'));

-- Create the private storage bucket for the customer-uploaded artwork
-- photos. Files are written by the API using the service-role client,
-- read by the studio via signed URLs sent in the notification email.
insert into storage.buckets (id, name, public)
values ('valuation-uploads', 'valuation-uploads', false)
on conflict (id) do nothing;
