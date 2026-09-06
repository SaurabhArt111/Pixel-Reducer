const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const ResizeJob = require('../models/ResizeJob');
const { isDbConnected } = require('../config/db');
const progressStore = require('../utils/progressStore');
const asyncPool = require('../utils/asyncPool');
const { extractZip, createZip } = require('./zipService');
const { readOrientedMetadata, computeOutputDimensions, processImage } = require('./imageService');
const { ensureDir, isSupportedImage, isZipFile, removeDirSafe, walkDir } = require('../utils/fileUtils');
const { sanitizeBaseName } = require('../utils/sanitize');
const { TEMP_DIR, OUTPUT_DIR, PROCESSING_CONCURRENCY, JOB_STATUS } = require('../utils/constants');

/**
 * After Multer has written the uploaded files (and possibly a raw ZIP) to
 * temp/{jobId}/raw, figure out the input type, extract any ZIP, read
 * dimensions for every image, and build the manifest the frontend queue
 * and the later /process step both rely on.
 */
async function handleUpload({ jobId, declaredInputType, uploadedFiles }) {
  const rawDir = path.join(TEMP_DIR, jobId, 'raw');
  await ensureDir(rawDir);

  const zipUpload = uploadedFiles.find((f) => isZipFile(f.originalname));
  let inputType = declaredInputType;
  let sourceBaseName;
  let imageFiles = []; // { absolutePath, relativePath }
  const skipped = [];

  if (zipUpload) {
    inputType = 'zip';
    sourceBaseName = sanitizeBaseName(path.basename(zipUpload.originalname, path.extname(zipUpload.originalname)));

    const extractDir = path.join(TEMP_DIR, jobId, 'extracted');
    try {
      imageFiles = await extractZip(zipUpload.path, extractDir);
    } catch (err) {
      const wrapped = new Error('This ZIP file is corrupt or could not be read.');
      wrapped.status = 400;
      throw wrapped;
    }

    // the raw zip itself isn't part of the image set - clean it up
    await fsp.unlink(zipUpload.path).catch(() => {});

    if (imageFiles.length === 0) {
      const err = new Error('The ZIP file does not contain any supported images.');
      err.status = 400;
      throw err;
    }
  } else {
    // single / multiple / folder - Multer already wrote files preserving
    // relative folder structure (see middleware/upload.js)
    const allWritten = await walkDir(rawDir);

    for (const f of allWritten) {
      if (isSupportedImage(f.relativePath)) {
        imageFiles.push(f);
      } else {
        skipped.push(f.relativePath);
      }
    }

    if (imageFiles.length === 0) {
      const err = new Error('No supported images were found in this upload.');
      err.status = 400;
      throw err;
    }

    const hasNestedPath = imageFiles.some((f) => f.relativePath.includes('/'));

    if (imageFiles.length === 1 && !hasNestedPath) {
      inputType = 'single';
      sourceBaseName = sanitizeBaseName(
        path.basename(imageFiles[0].relativePath, path.extname(imageFiles[0].relativePath))
      );
    } else if (hasNestedPath) {
      inputType = 'folder';
      const topLevel = imageFiles[0].relativePath.split('/')[0];
      sourceBaseName = sanitizeBaseName(topLevel);
    } else {
      inputType = 'multiple';
      sourceBaseName = sanitizeBaseName(
        path.basename(imageFiles[0].relativePath, path.extname(imageFiles[0].relativePath))
      );
    }
  }

  // Read dimensions (header-only, cheap) for every image up front so the
  // frontend can render the queue + live target-width preview instantly.
  const manifest = [];
  let originalSize = 0;

  for (const f of imageFiles) {
    let meta = { width: null, height: null, format: null };
    try {
      meta = await readOrientedMetadata(f.absolutePath);
    } catch {
      skipped.push(f.relativePath);
      continue;
    }
    const stat = await fsp.stat(f.absolutePath);
    originalSize += stat.size;

    manifest.push({
      relativePath: f.relativePath,
      absolutePath: f.absolutePath,
      size: stat.size,
      width: meta.width,
      height: meta.height,
      format: meta.format
    });
  }

  const job = progressStore.createJob(jobId, {
    status: JOB_STATUS.UPLOADED,
    inputType,
    sourceBaseName,
    manifest,
    total: manifest.length,
    originalSize,
    skipped
  });

  return job;
}

function buildZipName(sourceBaseName, targetWidth) {
  return `${sourceBaseName}_${targetWidth}px.zip`;
}

function buildSingleImageName(sourceBaseName, targetWidth, ext) {
  return `${sourceBaseName}_${targetWidth}px${ext}`;
}

/**
 * Kick off the actual resize pipeline. Not awaited by the caller - progress
 * is reported through progressStore and polled by the client.
 */
async function startProcessing(jobId, options) {
  const job = progressStore.getJob(jobId);
  if (!job) throw Object.assign(new Error('Job not found.'), { status: 404 });

  const { targetWidth, dontEnlarge, outputFormat, quality } = options;

  progressStore.updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    processed: 0,
    failed: 0,
    failedFiles: [],
    targetWidth,
    dontEnlarge,
    outputFormat,
    quality,
    outputSize: 0
  });

  // Persist an initial history record right away (best-effort - never blocks processing)
  if (isDbConnected()) {
    ResizeJob.create({
      jobId,
      sourceName: job.sourceBaseName,
      inputType: job.inputType,
      targetWidth,
      quality,
      outputFormat,
      dontEnlarge,
      totalFiles: job.total,
      originalSize: job.originalSize,
      status: JOB_STATUS.PROCESSING
    }).catch((err) => console.error('Failed to create history record:', err.message));
  }

  const outputDir = path.join(TEMP_DIR, jobId, 'output');
  await ensureDir(outputDir);

  const processedFiles = [];
  let outputSize = 0;

  await asyncPool(PROCESSING_CONCURRENCY, job.manifest, async (item) => {
    const outputAbsolutePath = path.join(outputDir, item.relativePath);
    await ensureDir(path.dirname(outputAbsolutePath));

    const expectedDims = computeOutputDimensions(item.width, item.height, targetWidth, dontEnlarge);

    progressStore.updateJob(jobId, {
      currentFile: item.relativePath,
      currentOriginalDims: { width: item.width, height: item.height },
      currentOutputDims: expectedDims
    });

    try {
      const result = await processImage({
        inputPath: item.absolutePath,
        outputPath: outputAbsolutePath,
        targetWidth,
        dontEnlarge,
        outputFormat,
        quality
      });

      const relativeOutPath = path
        .relative(outputDir, result.outputPath)
        .split(path.sep)
        .join('/');

      processedFiles.push({ absolutePath: result.outputPath, relativePath: relativeOutPath });
      outputSize += result.size;

      const current = progressStore.getJob(jobId);
      progressStore.updateJob(jobId, {
        processed: current.processed + 1,
        outputSize
      });
    } catch (err) {
      console.error(`Failed to process ${item.relativePath}:`, err.message);
      const current = progressStore.getJob(jobId);
      progressStore.updateJob(jobId, {
        failed: current.failed + 1,
        failedFiles: [...current.failedFiles, { file: item.relativePath, reason: err.message }]
      });
    }
  });

  await ensureDir(OUTPUT_DIR);

  const finalJob = progressStore.getJob(jobId);
  const zipName = buildZipName(job.sourceBaseName, targetWidth);
  const zipPath = path.join(OUTPUT_DIR, `${jobId}.zip`);

  let singleImageName = null;
  let singleImagePath = null;

  if (processedFiles.length > 0) {
    await createZip(processedFiles, zipPath);

    if (job.inputType === 'single' && processedFiles.length === 1) {
      const ext = path.extname(processedFiles[0].absolutePath);
      singleImageName = buildSingleImageName(job.sourceBaseName, targetWidth, ext);
      singleImagePath = processedFiles[0].absolutePath;
    }
  }

  const status = processedFiles.length > 0 ? JOB_STATUS.COMPLETED : JOB_STATUS.FAILED;

  progressStore.updateJob(jobId, {
    status,
    zipName: processedFiles.length > 0 ? zipName : null,
    zipPath: processedFiles.length > 0 ? zipPath : null,
    singleImageName,
    singleImagePath,
    currentFile: null
  });

  if (isDbConnected()) {
    ResizeJob.findOneAndUpdate(
      { jobId },
      {
        processedFiles: finalJob.processed,
        failedFiles: finalJob.failedFiles,
        outputSize,
        zipName: processedFiles.length > 0 ? zipName : null,
        singleImageName,
        status,
        completedAt: new Date()
      }
    ).catch((err) => console.error('Failed to update history record:', err.message));
  }

  // Working copies under temp/{jobId} (raw + output) are left in place so
  // the single-image download route can stream directly from them; they
  // are removed together by the retention sweep or on explicit deletion.
}

/** Remove every file on disk associated with a job (temp working dir + output zip). */
async function deleteJobFiles(jobId) {
  await removeDirSafe(path.join(TEMP_DIR, jobId));
  await removeDirSafe(path.join(OUTPUT_DIR, `${jobId}.zip`));
  progressStore.deleteJob(jobId);
}

module.exports = {
  handleUpload,
  startProcessing,
  deleteJobFiles,
  buildZipName,
  buildSingleImageName
};
