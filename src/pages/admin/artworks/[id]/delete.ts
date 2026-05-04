import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/artworks?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { data: row } = await supabase
    .from("artworks")
    .select("hero_image_path")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("artworks")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(`/admin/artworks/${id}?error=${encodeURIComponent(delErr.message)}`);
  }

  if (row?.hero_image_path) {
    await supabase.storage.from("artworks").remove([row.hero_image_path]);
  }

  return ctx.redirect("/admin/artworks?deleted=1");
};
