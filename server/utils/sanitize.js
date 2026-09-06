const path = require('path');

/**
 * Sanitize a display/base name (used for ZIP filenames, job source names).
 * Preserves spaces and unicode letters, strips characters that are unsafe
 * for filesystems / HTTP headers, and trims stray dots/spaces.
 */
function sanitizeBaseName(name) {
  if (!name || typeof name !== 'string') return 'download';

  const withoutPath = name.replace(/^.*[/\\]/, '');
  const cleaned = withoutPath
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .trim()
    .replace(/\.+$/, '')
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 180) : 'download';
}

/**
 * Sanitize a single path segment (a folder or file name), stripping
 * anything that could be used to escape the intended directory.
 */
function sanitizeSegment(segment) {
  const cleaned = String(segment)
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim();
  if (cleaned === '' || cleaned === '.' || cleaned === '..') return '_';
  return cleaned;
}

/**
 * Sanitize a relative path made of multiple segments (e.g. "Kitchen/K001.jpg"),
 * rejecting traversal attempts and absolute paths, and normalizing separators.
 * Returns a clean, relative path safe to join under a base directory.
 */
function sanitizeRelativePath(relativePath) {
  const normalized = String(relativePath).replace(/\\/g, '/');
  const segments = normalized
    .split('/')
    .filter((seg) => seg !== '' && seg !== '.' && seg !== '..')
    .map(sanitizeSegment);

  if (segments.length === 0) return 'file';
  return segments.join('/');
}

/**
 * Resolve `relativePath` under `baseDir` and guarantee the resolved path
 * still lives inside `baseDir` (defends against zip-slip / path traversal).
 * Throws if the resolved path escapes the base directory.
 */
function safeJoin(baseDir, relativePath) {
  const safeRelative = sanitizeRelativePath(relativePath);
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, safeRelative);

  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Unsafe path detected: ${relativePath}`);
  }

  return resolvedTarget;
}

module.exports = {
  sanitizeBaseName,
  sanitizeSegment,
  sanitizeRelativePath,
  safeJoin
};
