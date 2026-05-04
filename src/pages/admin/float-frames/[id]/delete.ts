import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/float-frames?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { data: row } = await supabase
    .from("float_frames")
    .select("image_path")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("float_frames")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(
      `/admin/float-frames/${id}?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  if (row?.image_path) {
    await supabase.storage.from("float-frames").remove([row.image_path]);
  }

  return ctx.redirect("/admin/float-frames?deleted=1");
};
