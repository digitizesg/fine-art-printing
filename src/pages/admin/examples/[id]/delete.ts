import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  // Look up the image path so we can clean up storage too.
  const { data: row } = await supabase
    .from("frame_examples")
    .select("image_path")
    .eq("id", id)
    .single();

  const { error: delErr } = await supabase
    .from("frame_examples")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(
      `/admin/examples/${id}?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  if (row?.image_path) {
    await supabase.storage.from("frame-examples").remove([row.image_path]);
  }

  return ctx.redirect("/admin?deleted=1");
};
