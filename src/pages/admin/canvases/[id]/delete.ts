import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/canvases?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { data: row } = await supabase
    .from("canvases")
    .select("images")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("canvases")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(
      `/admin/canvases/${id}?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  const images: string[] = Array.isArray(row?.images) ? (row!.images as string[]) : [];
  if (images.length) {
    await supabase.storage.from("canvases").remove(images);
  }

  return ctx.redirect("/admin/canvases?deleted=1");
};
