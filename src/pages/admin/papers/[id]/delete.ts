import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/papers?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { data: row } = await supabase
    .from("papers")
    .select("images")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("papers")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(
      `/admin/papers/${id}?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  const images: string[] = Array.isArray(row?.images) ? (row!.images as string[]) : [];
  if (images.length) {
    await supabase.storage.from("papers").remove(images);
  }

  return ctx.redirect("/admin/papers?deleted=1");
};
