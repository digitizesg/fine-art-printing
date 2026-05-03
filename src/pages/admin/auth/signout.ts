import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export const POST: APIRoute = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);
  await supabase.auth.signOut();
  return ctx.redirect("/admin/login");
};
