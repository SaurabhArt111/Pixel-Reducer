const path = require('path');
const fs = require('fs');

const jobService = require('../services/jobService');
const progressStore = require('../utils/progressStore');
const ResizeJob = require('../models/ResizeJob');
const { isDbConnected } = require('../config/db');
const { formatBytes } = require('../utils/fileUtils');
const { WIDTH_PRESETS, OUTPUT_FORMATS, OUTPUT_DIR } = require('../utils/constants');

function toPublicManifest(job) {
  return job.manifest.map((f) => ({
    relativePath: f.relativePath,
    size: f.size,
    width: f.width,
    height: f.height,
    format: f.format
  }));
}

function toPublicJob(job) {
  return {
    jobId: job.jobId,
    status: job.status,
    inputType: job.inputType,
    sourceBaseName: job.sourceBaseName,
    total: job.total,
    processed: job.processed,
    failed: job.failed,
    currentFile: job.currentFile,
    currentOriginalDims: job.currentOriginalDims,
    currentOutputDims: job.currentOutputDims,
    failedFiles: job.failedFiles,
    originalSize: job.originalSize,
    outputSize: job.outputSize,
    originalSizeLabel: formatBytes(job.originalSize),
    outputSizeLabel: formatBytes(job.outputSize),
    savedLabel: formatBytes(Math.max(0, job.originalSize - job.outputSize)),
    zipName: job.zipName || null,
    singleImageName: job.singleImageName || null,
    skipped: job.skipped || []
  };
}

/**
 * POST /api/resize/upload
 * Accepts images (single/multiple/folder, via field "files") or a ZIP
 * (also via "files") and returns a manifest the client uses to render
 * the queue and drive the live target-width preview.
 */
async function uploadFiles(req, res, next) {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded.' });
    }

    const job = await jobService.handleUpload({
      jobId: req.jobId,
      declaredInputType: req.body.inputType,
      uploadedFiles: files
    });

    res.status(201).json({
      success: true,
      jobId: job.jobId,
      inputType: job.inputType,
      sourceBaseName: job.sourceBaseName,
      totalFiles: job.total,
      totalSize: job.originalSize,
      totalSizeLabel: formatBytes(job.originalSize),
      skipped: job.skipped,
      files: toPublicManifest(job),
      widthPresets: WIDTH_PRESETS,
      outputFormats: OUTPUT_FORMATS
    });
  } catch (err) {
    // Don't leave partially-written temp files behind for a failed upload
    jobService.deleteJobFiles(req.jobId).catch(() => {});
    next(err);
  }
}

/**
 * POST /api/resize/process
 * Kicks off resizing for a previously-uploaded job. Responds immediately;
 * progress is polled via GET /status/:jobId.
 */
async function processJob(req, res, next) {
  try {
    const { jobId, targetWidth, dontEnlarge, outputFormat, quality } = req.validated;

    const job = progressStore.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found. Please upload again.' });
    }
    if (job.status === 'processing') {
      return res.status(409).json({ success: false, message: 'This job is already processing.' });
    }

    res.status(202).json({ success: true, jobId, status: 'processing' });

    // Fire and forget - progress is reported through the status endpoint.
    jobService.startProcessing(jobId, { targetWidth, dontEnlarge, outputFormat, quality }).catch((err) => {
      console.error(`Processing failed for job ${jobId}:`, err);
      progressStore.updateJob(jobId, { status: 'failed', error: err.message });
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/resize/status/:jobId */
function getStatus(req, res) {
  const job = progressStore.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found.' });
  }
  res.json({ success: true, job: toPublicJob(job) });
}

/** GET /api/resize/:jobId */
async function getJob(req, res) {
  const job = progressStore.getJob(req.params.jobId);
  if (job) {
    return res.json({ success: true, job: toPublicJob(job), files: toPublicManifest(job) });
  }

  if (isDbConnected()) {
    const historyJob = await ResizeJob.findOne({ jobId: req.params.jobId }).lean();
    if (historyJob) return res.json({ success: true, job: historyJob, files: [] });
  }

  res.status(404).json({ success: false, message: 'Job not found.' });
}

/** GET /api/resize/download/:jobId?type=zip|image */
async function download(req, res) {
  const type = req.query.type === 'image' ? 'image' : 'zip';
  const memoryJob = progressStore.getJob(req.params.jobId);

  let filePath = null;
  let downloadName = null;
  let status = memoryJob?.status;

  if (memoryJob) {
    filePath = type === 'image' ? memoryJob.singleImagePath : memoryJob.zipPath;
    downloadName = type === 'image' ? memoryJob.singleImageName : memoryJob.zipName;
  } else if (isDbConnected()) {
    // The in-memory record is gone (e.g. the server restarted) - fall back
    // to the durable history record + the on-disk zip, which the retention
    // sweep keeps around for JOB_RETENTION_HOURS.
    const historyJob = await ResizeJob.findOne({ jobId: req.params.jobId }).lean();
    if (historyJob) {
      status = historyJob.status;
      if (type === 'zip') {
        filePath = path.join(OUTPUT_DIR, `${req.params.jobId}.zip`);
        downloadName = historyJob.zipName;
      } else {
        downloadName = historyJob.singleImageName;
        // Individual working files aren't tracked in Mongo - only the zip survives a restart.
      }
    }
  }

  if (!status) {
    return res.status(404).json({ success: false, message: 'Job not found or its files have expired.' });
  }

  if (status !== 'completed') {
    return res.status(409).json({ success: false, message: 'This job has not finished processing yet.' });
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(410).json({ success: false, message: 'This file is no longer available.' });
  }

  res.download(path.resolve(filePath), downloadName);
}

/** DELETE /api/resize/:jobId */
async function deleteJob(req, res, next) {
  try {
    const memJob = progressStore.getJob(req.params.jobId);
    if (memJob && memJob.status === 'processing') {
      return res.status(409).json({
        success: false,
        message: 'This job is still processing and cannot be deleted yet.'
      });
    }

    await jobService.deleteJobFiles(req.params.jobId);
    if (isDbConnected()) {
      await ResizeJob.deleteOne({ jobId: req.params.jobId });
    }
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFiles, processJob, getStatus, getJob, download, deleteJob };
