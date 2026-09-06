/**
 * Mirrors the backend's resize math (see server/services/imageService.js)
 * so the UI can show an instant "Output: W × H" preview per file without
 * a round trip, and stays correct if the user tweaks width/enlarge later.
 */
export function computeOutputDimensions(originalWidth, originalHeight, targetWidth, dontEnlarge) {
  if (!originalWidth || !originalHeight || !targetWidth) {
    return { width: null, height: null };
  }
  const effectiveWidth = dontEnlarge ? Math.min(targetWidth, originalWidth) : targetWidth;
  const height = Math.round((effectiveWidth / originalWidth) * originalHeight);
  return { width: Math.round(effectiveWidth), height };
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function extOf(name) {
  const match = /\.[^./]+$/.exec(name || '');
  return match ? match[0].toLowerCase() : '';
}
