const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const {
  TEMP_DIR,
  MAX_FILE_SIZE,
  MAX_FILES,
  SUPPORTED_IMAGE_MIME_TYPES,
  ZIP_MIME_TYPES
} = require('../utils/constants');
const { isSupportedImage, isZipFile } = require('../utils/fileUtils');
const { sanitizeRelativePath, safeJoin } = require('../utils/sanitize');

/** Assigns a fresh job id to the request before Multer starts writing files. */
function assignJobId(req, res, next) {
  req.jobId = uuidv4();
  next();
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      // fileFilter (below) already resolved + sanitized this file's
      // relative path and stashed it, before deciding accept/reject.
      const relativePath = file.sanitizedRelativePath || sanitizeRelativePath(file.originalname || 'file');
      const rawDir = path.dirname(relativePath);
      const rootDir = safeJoin(TEMP_DIR, path.join(req.jobId, 'raw'));
      const destDir = rawDir === '.' ? rootDir : safeJoin(rootDir, rawDir);

      fs.mkdir(destDir, { recursive: true }, (err) => {
        if (err) return cb(err);
        cb(null, destDir);
      });
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    const relativePath = file.sanitizedRelativePath || file.originalname;
    cb(null, path.basename(relativePath));
  }
});

function fileFilter(req, file, cb) {
  // Multer/Busboy strip directory separators out of `originalname` for
  // security, so folder structure can't survive in the filename alone.
  // Instead the client sends a parallel "relativePaths" JSON field
  // (appended before the files, so it parses first) and we match each
  // file to its path by upload order. This must run here rather than in
  // `destination` because fileFilter sees every file in stream order -
  // including ones about to be rejected below - whereas `destination` is
  // only called for accepted files, which would desync the index the
  // moment any file in the batch gets filtered out.
  if (req._relativePaths === undefined) {
    try {
      req._relativePaths = req.body.relativePaths ? JSON.parse(req.body.relativePaths) : null;
    } catch {
      req._relativePaths = null;
    }
    req._fileCounter = 0;
  }

  const idx = req._fileCounter++;
  const rawRelative = (Array.isArray(req._relativePaths) && req._relativePaths[idx]) || file.originalname || 'file';
  file.sanitizedRelativePath = sanitizeRelativePath(rawRelative);

  const mimeOk =
    SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimetype) ||
    ZIP_MIME_TYPES.includes(file.mimetype) ||
    isSupportedImage(file.originalname) ||
    isZipFile(file.originalname);

  if (!mimeOk) {
    // Reject silently (skip) rather than aborting the whole upload -
    // unsupported files inside a batch/zip should not crash it.
    return cb(null, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  }
});

module.exports = { upload, assignJobId };
