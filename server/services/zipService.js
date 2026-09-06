const fs = require('fs');
const unzipper = require('unzipper');
const archiver = require('archiver');
const { ensureDir, isSupportedImage } = require('../utils/fileUtils');
const { safeJoin, sanitizeRelativePath } = require('../utils/sanitize');

/**
 * Extract a ZIP file to `destDir`, skipping directories, hidden/system
 * junk (e.g. __MACOSX, .DS_Store) and anything that isn't a supported
 * image. Every entry path is sanitized and re-resolved under `destDir`
 * so a malicious archive can never write outside of it (zip-slip).
 *
 * Returns the list of extracted { absolutePath, relativePath } images.
 */
async function extractZip(zipPath, destDir) {
  await ensureDir(destDir);
  const extracted = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        const rawPath = entry.path;
        const isDir = entry.type === 'Directory';

        const isJunk =
          rawPath.startsWith('__MACOSX') ||
          rawPath.split('/').some((seg) => seg === '.DS_Store' || seg.startsWith('._'));

        if (isDir || isJunk || !isSupportedImage(rawPath)) {
          entry.autodrain();
          return;
        }

        try {
          const relativePath = sanitizeRelativePath(rawPath);
          const targetPath = safeJoin(destDir, relativePath);

          ensureDir(require('path').dirname(targetPath))
            .then(() => {
              const writeStream = entry.pipe(fs.createWriteStream(targetPath));
              writeStream.on('finish', () => {
                extracted.push({ absolutePath: targetPath, relativePath });
              });
              writeStream.on('error', (err) => reject(err));
            })
            .catch(reject);
        } catch (err) {
          // Unsafe path in the archive - drop this entry, don't fail the whole batch
          entry.autodrain();
        }
      })
      .on('close', resolve)
      .on('error', reject);
  });

  return extracted;
}

/**
 * Stream-create a ZIP archive at `outputZipPath` from a list of
 * { absolutePath, relativePath } files, preserving folder structure.
 */
function createZip(files, outputZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve({ size: archive.pointer() }));
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });
    archive.on('error', reject);

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.absolutePath, { name: file.relativePath });
    }

    archive.finalize();
  });
}

module.exports = { extractZip, createZip };
