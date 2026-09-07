const THUMB_MAX_DIM = 120;

/**
 * Produce a small JPEG thumbnail object URL for `file`, sized to fit within
 * THUMB_MAX_DIM on its longest edge. This is the actual fix for scroll lag
 * with large batches: an <img> pointed at a multi-megabyte original forces
 * the browser to decode the full-resolution image just to paint a 48px
 * thumbnail, and virtualized rows re-trigger that decode every time they
 * scroll back into view. Decoding once via createImageBitmap and caching a
 * tiny re-encoded copy makes repeat scrolling essentially free.
 *
 * Returns null if thumbnailing isn't possible (unsupported browser,
 * corrupt file, etc.) - callers should fall back to a placeholder swatch.
 */
export async function generateThumbnail(file, originalWidth, originalHeight) {
  if (typeof createImageBitmap !== 'function') return null;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const w = originalWidth || bitmap.width;
    const h = originalHeight || bitmap.height;
    const scale = Math.min(1, THUMB_MAX_DIM / Math.max(w, h));
    const thumbW = Math.max(1, Math.round(w * scale));
    const thumbH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, thumbW, thumbH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
    if (!blob) return null;

    return URL.createObjectURL(blob);
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}
