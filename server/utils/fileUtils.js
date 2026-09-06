const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { SUPPORTED_IMAGE_EXTENSIONS } = require('./constants');

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function isSupportedImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

function isZipFile(filename) {
  return path.extname(filename).toLowerCase() === '.zip';
}

/**
 * Recursively walk a directory, returning a flat list of
 * { absolutePath, relativePath } for every file found.
 */
async function walkDir(dir, baseDir = dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  let results = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDir(absolutePath, baseDir);
      results = results.concat(nested);
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, absolutePath).split(path.sep).join('/');
      results.push({ absolutePath, relativePath });
    }
  }

  return results;
}

async function removeDirSafe(dirPath) {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    // Non-fatal: log and move on so a cleanup failure never crashes a request
    console.error(`Failed to remove ${dirPath}:`, err.message);
  }
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

async function getDirSize(dirPath) {
  const files = await walkDir(dirPath).catch(() => []);
  let total = 0;
  for (const f of files) {
    try {
      const stat = await fsp.stat(f.absolutePath);
      total += stat.size;
    } catch {
      // file may have been removed mid-scan; ignore
    }
  }
  return total;
}

module.exports = {
  ensureDir,
  isSupportedImage,
  isZipFile,
  walkDir,
  removeDirSafe,
  pathExists,
  formatBytes,
  getDirSize
};
