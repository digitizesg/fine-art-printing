-- Phase 3e: distinguish shop orders from ad-hoc payments via the
-- /make-payment page (invoiced over WhatsApp, etc.).
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

alter table public.orders
  add column if not exists kind text not null default 'shop'
  check (kind in ('shop', 'custom_payment'));

create index if not exists orders_kind_idx on public.orders (kind);
