/**
 * POST /admin/artworks — create a new artwork.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 25 * 1024 * 1024;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseSizes(raw: string): { width_cm: number; height_cm: number; label?: string }[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s: any) => ({
        width_cm: Number(s.width_cm),
        height_cm: Number(s.height_cm),
        label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : undefined,
      }))
      .filter((s) => Number.isFinite(s.width_cm) && s.width_cm > 0 && Number.isFinite(s.height_cm) && s.height_cm > 0);
  } catch {
    return [];
  }
}

export const POST: APIRoute = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);
  const form = await ctx.request.formData();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return ctx.redirect("/admin/artworks/new?error=missing_title");

  let slug = String(form.get("slug") ?? "").trim().toLowerCase();
  if (!slug) slug = slugify(title);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return ctx.redirect("/admin/artworks/new?error=invalid_slug");
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return ctx.redirect("/admin/artworks/new?error=missing_image");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return ctx.redirect("/admin/artworks/new?error=bad_type");
  }
  if (file.size > MAX_BYTES) {
    return ctx.redirect("/admin/artworks/new?error=too_big");
  }

  const ext = file.type === "image/png" ? ".png" : extname(file.name) || ".jpg";
  const imagePath = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("artworks")
    .upload(imagePath, buffer, { contentType: file.type, upsert: false });
  if (upErr) {
    return ctx.redirect(`/admin/artworks/new?error=${encodeURIComponent(upErr.message)}`);
  }

  const sizes = parseSizes(String(form.get("available_sizes") ?? "[]"));

  const row = {
    slug,
    title,
    artist_name: (form.get("artist_name") as string)?.trim() || null,
    description: (form.get("description") as string)?.trim() || null,
    hero_image_path: imagePath,
    available_sizes: sizes,
    allow_paper: form.get("allow_paper") === "1",
    allow_canvas: form.get("allow_canvas") === "1",
    published: form.get("published") === "1",
    featured: form.get("featured") === "1",
  };

  const { data, error: insErr } = await supabase
    .from("artworks")
    .insert(row)
    .select("id")
    .single();

  if (insErr) {
    await supabase.storage.from("artworks").remove([imagePath]);
    return ctx.redirect(`/admin/artworks/new?error=${encodeURIComponent(insErr.message)}`);
  }

  return ctx.redirect(`/admin/artworks/${data.id}?created=1`);
};
