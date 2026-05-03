/**
 * POST /admin/examples — create a new frame example.
 * Multipart form-data: image (file), service, subject, caption, etc.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const POST: APIRoute = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  const form = await ctx.request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return ctx.redirect("/admin/examples/new?error=missing_image");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return ctx.redirect("/admin/examples/new?error=bad_type");
  }
  if (file.size > MAX_BYTES) {
    return ctx.redirect("/admin/examples/new?error=too_big");
  }

  const ext = file.type === "image/png" ? ".png" : extname(file.name) || ".jpg";
  const imagePath = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("frame-examples")
    .upload(imagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return ctx.redirect(
      `/admin/examples/new?error=${encodeURIComponent(upErr.message)}`,
    );
  }

  const row = {
    service: String(form.get("service") ?? ""),
    subject: String(form.get("subject") ?? ""),
    caption: (form.get("caption") as string)?.trim() || null,
    featured: form.get("featured") === "1",
    picture_frame_id: (form.get("picture_frame_id") as string)?.trim() || null,
    float_frame_id: (form.get("float_frame_id") as string)?.trim() || null,
    stretching_depth: (form.get("stretching_depth") as string)?.trim() || null,
    canvas_id: (form.get("canvas_id") as string)?.trim() || null,
    image_path: imagePath,
  };

  const { data, error: insErr } = await supabase
    .from("frame_examples")
    .insert(row)
    .select("id")
    .single();

  if (insErr) {
    // Try to clean up the orphaned upload.
    await supabase.storage.from("frame-examples").remove([imagePath]);
    return ctx.redirect(
      `/admin/examples/new?error=${encodeURIComponent(insErr.message)}`,
    );
  }

  return ctx.redirect(`/admin/examples/${data.id}?created=1`);
};
