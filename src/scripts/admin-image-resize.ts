/**
 * Client-side image downscaling for admin upload forms.
 *
 * Admin photos (frame examples, float-frame swatches, canvas samples) were
 * being uploaded straight from camera/phone at full resolution — multi-MB
 * files for images that are only ever shown small or lightly zoomed. This
 * shrinks the selected image in the browser BEFORE the form submits, so a
 * sensibly-sized file is what reaches Supabase storage.
 *
 * Wiring: add `data-resize-images` to a <form> and import this module from the
 * form's <script>. Every <input type="file"> holding an image is downscaled to
 * MAX_EDGE on its longest side and re-encoded; the original format is kept so
 * PNG transparency is never silently flattened. If the result isn't actually
 * smaller (already-optimised images), the original file is left untouched.
 *
 * This is a UX/quality measure, not a security control — the server handlers
 * still validate type and enforce their own size cap.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
/** Below this, an unscaled image is left alone (already small enough). */
const SKIP_UNDER_BYTES = 600 * 1024;

async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Undecodable here (e.g. HEIC) — let the server deal with it.
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  if (scale === 1 && file.size <= SKIP_UNDER_BYTES) {
    bitmap.close?.();
    return file;
  }

  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const isPng = file.type === "image/png";
  const outType = isPng ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outType, isPng ? undefined : JPEG_QUALITY),
  );
  // Keep the original if encoding failed or didn't actually save anything.
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const ext = isPng ? ".png" : ".jpg";
  return new File([blob], `${baseName}${ext}`, { type: outType });
}

function setupForm(form: HTMLFormElement): void {
  form.addEventListener("submit", (event) => {
    // Second pass after we've resized and re-requested submit: let it through.
    if (form.dataset.resizeDone === "1") {
      form.dataset.resizeDone = "";
      return;
    }

    const submitter = (event as SubmitEvent).submitter as HTMLElement | null;
    // Don't touch alternate-action submits (e.g. the Delete button) — they
    // carry their own formaction and don't need the image.
    if (submitter?.getAttribute("formaction")) return;

    const inputs = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type="file"]'),
    ).filter((input) =>
      Array.from(input.files ?? []).some((f) => f.type.startsWith("image/")),
    );
    if (inputs.length === 0) return;

    event.preventDefault();
    const submitBtn = submitter as HTMLButtonElement | null;
    const originalLabel = submitBtn?.textContent ?? null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Optimising image…";
    }

    void (async () => {
      for (const input of inputs) {
        // Handle multi-file inputs (e.g. an artwork gallery) — resize every
        // file and rebuild the list, so we never drop the extra selections.
        const originals = Array.from(input.files ?? []);
        const dt = new DataTransfer();
        let changed = false;
        for (const original of originals) {
          let out = original;
          try {
            const resized = await downscaleImage(original);
            if (resized !== original) {
              out = resized;
              changed = true;
            }
          } catch {
            /* keep original on any failure */
          }
          dt.items.add(out);
        }
        if (changed) input.files = dt.files;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        if (originalLabel !== null) submitBtn.textContent = originalLabel;
      }
      form.dataset.resizeDone = "1";
      form.requestSubmit(submitter ?? undefined);
    })();
  });
}

document
  .querySelectorAll<HTMLFormElement>("form[data-resize-images]")
  .forEach(setupForm);
