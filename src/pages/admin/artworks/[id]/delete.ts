import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/artworks?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { data: row } = await supabase
    .from("artworks")
    .select("hero_image_path, gallery_images")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("artworks")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(`/admin/artworks/${id}?error=${encodeURIComponent(delErr.message)}`);
  }

  const toRemove: string[] = [];
  if (row?.hero_image_path) toRemove.push(row.hero_image_path);
  if (Array.isArray(row?.gallery_images)) {
    toRemove.push(...(row!.gallery_images as string[]));
  }
  if (toRemove.length) {
    await supabase.storage.from("artworks").remove(toRemove);
  }

  return ctx.redirect("/admin/artworks?deleted=1");
};
