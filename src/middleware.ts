/**
 * Auth gate for /admin/*.
 *
 * Anyone trying to load an admin page without a session is redirected to
 * /admin/login (preserving the original path as `next`). Login + the auth
 * callback are exempt so users can actually log in.
 */
import { defineMiddleware } from "astro:middleware";
import { getSession } from "./lib/supabase-server";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/auth/callback",
  "/admin/auth/signout",
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith("/admin")) {
    return next();
  }
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return next();
  }

  const { user } = await getSession(context);
  if (!user) {
    const loginUrl = new URL("/admin/login", context.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname + context.url.search);
    }
    return context.redirect(loginUrl.pathname + loginUrl.search);
  }

  // Hand the user down to the page so it doesn't have to re-fetch.
  context.locals.user = user;
  return next();
});
