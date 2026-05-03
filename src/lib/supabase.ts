/**
 * Supabase clients.
 *
 * - `supabasePublic` — anon key, fine to use anywhere (build-time fetch on
 *   marketing pages, client-side reads). Bound by RLS.
 * - `getSupabaseAdmin()` — service-role key, server-only. Used by the
 *   migration script and any server endpoint that needs to bypass RLS.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Check PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabasePublic: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Marketing pages don't need session persistence; admin pages set this up themselves.
      persistSession: false,
    },
  },
);

/** Server-only admin client. Throws if called without the service role key. */
export function getSupabaseAdmin(): SupabaseClient {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Admin clients must run server-side only.",
    );
  }
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const FRAME_EXAMPLES_BUCKET = "frame-examples";

/** Build a public URL for an image stored in the frame-examples bucket. */
export function frameExampleUrl(imagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${FRAME_EXAMPLES_BUCKET}/${imagePath}`;
}
