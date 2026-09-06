const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Everything the app writes to disk lives under a single `uploads/` root:
//   uploads/temp/{jobId}/...   working files while a job is processed
//   uploads/output/{jobId}.zip  the final downloadable archive
// This keeps the whole working tree in one place instead of scattering it
// across separate top-level folders.
const UPLOAD_DIR = path.join(ROOT_DIR, process.env.UPLOAD_DIR || 'uploads');
const TEMP_DIR = path.join(ROOT_DIR, process.env.TEMP_DIR || path.join('uploads', 'temp'));
const OUTPUT_DIR = path.join(ROOT_DIR, process.env.OUTPUT_DIR || path.join('uploads', 'output'));

// Extensions we know how to decode/re-encode with Sharp
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff'
];

const ZIP_EXTENSION = '.zip';
const ZIP_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip'
];

const WIDTH_PRESETS = [3000, 4000, 6000];

const OUTPUT_FORMATS = ['original', 'jpg', 'png', 'webp'];

const INPUT_TYPES = ['single', 'multiple', 'folder', 'zip'];

const JOB_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 500 * 1024 * 1024; // 500MB
const MAX_FILES = parseInt(process.env.MAX_FILES, 10) || 2000;
const JOB_RETENTION_HOURS = parseInt(process.env.JOB_RETENTION_HOURS, 10) || 24;

// How many images to process concurrently (bounded to avoid saturating CPU/memory)
const PROCESSING_CONCURRENCY = 4;

module.exports = {
  ROOT_DIR,
  UPLOAD_DIR,
  TEMP_DIR,
  OUTPUT_DIR,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIME_TYPES,
  ZIP_EXTENSION,
  ZIP_MIME_TYPES,
  WIDTH_PRESETS,
  OUTPUT_FORMATS,
  INPUT_TYPES,
  JOB_STATUS,
  MAX_FILE_SIZE,
  MAX_FILES,
  JOB_RETENTION_HOURS,
  PROCESSING_CONCURRENCY
};
