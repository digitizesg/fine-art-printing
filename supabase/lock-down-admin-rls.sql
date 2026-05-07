-- Replace the broad `auth.role() = 'authenticated'` admin policies on
-- table + storage with an email allowlist. Without this, any signed-in
-- Supabase user can write to artworks / papers / canvases /
-- float_frames / orders / frame_examples / publish_state, plus the
-- admin storage buckets — the middleware allowlist only protects the
-- /admin pages, not direct PostgREST or Storage calls.
--
-- Single source of truth: a SQL function `public.is_admin()` that
-- returns true when the JWT email is in the hardcoded list. Edit the
-- list inside the function body (not in N policies) when adding a new
-- admin.
--
-- Paste into Supabase Studio → SQL Editor → New Query → Run.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = any (array[
      'ben.rush@digitize.com.sg'
    ]),
    false
  );
$$;

-- ── Tables ────────────────────────────────────────────────────────

drop policy if exists "Authenticated can manage artworks" on public.artworks;
create policy "Admin can manage artworks"
  on public.artworks for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage papers" on public.papers;
create policy "Admin can manage papers"
  on public.papers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage canvases" on public.canvases;
create policy "Admin can manage canvases"
  on public.canvases for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage float_frames" on public.float_frames;
create policy "Admin can manage float_frames"
  on public.float_frames for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage frame_examples" on public.frame_examples;
create policy "Admin can manage frame_examples"
  on public.frame_examples for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage orders" on public.orders;
create policy "Admin can manage orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can manage publish_state" on public.publish_state;
create policy "Admin can manage publish_state"
  on public.publish_state for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Storage buckets ───────────────────────────────────────────────

drop policy if exists "Authenticated can upload artworks" on storage.objects;
drop policy if exists "Authenticated can update artworks" on storage.objects;
drop policy if exists "Authenticated can delete artworks" on storage.objects;
create policy "Admin can upload artworks"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks' and public.is_admin());
create policy "Admin can update artworks"
  on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and public.is_admin());
create policy "Admin can delete artworks"
  on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and public.is_admin());

drop policy if exists "Authenticated can upload papers" on storage.objects;
drop policy if exists "Authenticated can update papers" on storage.objects;
drop policy if exists "Authenticated can delete papers" on storage.objects;
create policy "Admin can upload papers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'papers' and public.is_admin());
create policy "Admin can update papers"
  on storage.objects for update to authenticated
  using (bucket_id = 'papers' and public.is_admin());
create policy "Admin can delete papers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'papers' and public.is_admin());

drop policy if exists "Authenticated can upload canvases" on storage.objects;
drop policy if exists "Authenticated can update canvases" on storage.objects;
drop policy if exists "Authenticated can delete canvases" on storage.objects;
create policy "Admin can upload canvases"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'canvases' and public.is_admin());
create policy "Admin can update canvases"
  on storage.objects for update to authenticated
  using (bucket_id = 'canvases' and public.is_admin());
create policy "Admin can delete canvases"
  on storage.objects for delete to authenticated
  using (bucket_id = 'canvases' and public.is_admin());

drop policy if exists "Authenticated can upload float-frames" on storage.objects;
drop policy if exists "Authenticated can update float-frames" on storage.objects;
drop policy if exists "Authenticated can delete float-frames" on storage.objects;
create policy "Admin can upload float-frames"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'float-frames' and public.is_admin());
create policy "Admin can update float-frames"
  on storage.objects for update to authenticated
  using (bucket_id = 'float-frames' and public.is_admin());
create policy "Admin can delete float-frames"
  on storage.objects for delete to authenticated
  using (bucket_id = 'float-frames' and public.is_admin());

drop policy if exists "Authenticated can upload frame-examples" on storage.objects;
drop policy if exists "Authenticated can update frame-examples" on storage.objects;
drop policy if exists "Authenticated can delete frame-examples" on storage.objects;
create policy "Admin can upload frame-examples"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'frame-examples' and public.is_admin());
create policy "Admin can update frame-examples"
  on storage.objects for update to authenticated
  using (bucket_id = 'frame-examples' and public.is_admin());
create policy "Admin can delete frame-examples"
  on storage.objects for delete to authenticated
  using (bucket_id = 'frame-examples' and public.is_admin());
