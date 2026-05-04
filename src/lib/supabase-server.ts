/**
 * Per-request Supabase client for Astro SSR routes (admin/* + api/*).
 *
 * Reads/writes the auth session via cookies on Astro's APIContext, so
 * subsequent requests see the same logged-in user.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { APIContext, AstroCookies } from "astro";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY for server client",
  );
}

export function createSupabaseServerClient(ctx: {
  cookies: AstroCookies;
  request: Request;
}) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        // AstroCookies doesn't expose a way to list all cookies, so parse
        // them directly off the request header.
        const header = ctx.request.headers.get("cookie") ?? "";
        return header
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((pair) => {
            const eq = pair.indexOf("=");
            if (eq === -1) return { name: pair, value: "" };
            return {
              name: pair.slice(0, eq),
              value: decodeURIComponent(pair.slice(eq + 1)),
            };
          });
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          ctx.cookies.set(name, value, {
            ...options,
            // Defensive defaults in case the helper omits them.
            path: options?.path ?? "/",
            httpOnly: options?.httpOnly ?? true,
            sameSite: (options?.sameSite as "lax") ?? "lax",
            secure: options?.secure ?? import.meta.env.PROD,
          });
        }
      },
    },
  });
}

export async function getSession(
  ctx: Pick<APIContext, "cookies" | "request">,
) {
  const supabase = createSupabaseServerClient(ctx);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Service-role Supabase client for backend-only flows (Stripe webhook,
 * checkout endpoint). Bypasses RLS — never expose to the browser.
 * Returns null if the service role key isn't configured.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
