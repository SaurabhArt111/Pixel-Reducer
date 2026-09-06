const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const progressStore = require('../utils/progressStore');
const ResizeJob = require('../models/ResizeJob');
const { isDbConnected } = require('../config/db');
const { getDirSize, formatBytes, pathExists } = require('../utils/fileUtils');
const { TEMP_DIR, OUTPUT_DIR } = require('../utils/constants');

/**
 * GET /api/storage/jobs
 * Lists every job with files still on disk under uploads/temp/ or
 * uploads/output/, merging
 * live in-memory status with the durable Mongo record where available, so
 * the Storage page reflects what's actually taking up space right now.
 */
async function listJobs(req, res) {
  let tempDirs = [];
  let outputFiles = [];

  try {
    const entries = await fsp.readdir(TEMP_DIR, { withFileTypes: true });
    tempDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    tempDirs = [];
  }
  try {
    outputFiles = await fsp.readdir(OUTPUT_DIR);
  } catch {
    outputFiles = [];
  }

  const jobIds = new Set([
    ...tempDirs,
    ...outputFiles.filter((f) => f.endsWith('.zip')).map((f) => f.replace(/\.zip$/, ''))
  ]);

  const jobs = [];

  for (const jobId of jobIds) {
    const tempPath = path.join(TEMP_DIR, jobId);
    const zipPath = path.join(OUTPUT_DIR, `${jobId}.zip`);
    const [hasTemp, hasZip] = await Promise.all([pathExists(tempPath), pathExists(zipPath)]);

    if (!hasTemp && !hasZip) continue;

    let sizeBytes = 0;
    if (hasTemp) sizeBytes += await getDirSize(tempPath);
    if (hasZip) {
      try {
        sizeBytes += (await fsp.stat(zipPath)).size;
      } catch {
        // file vanished between the readdir and stat - ignore
      }
    }

    const memJob = progressStore.getJob(jobId);
    let sourceBaseName = memJob?.sourceBaseName;
    let status = memJob?.status;
    let createdAt = memJob?.createdAt ? new Date(memJob.createdAt).toISOString() : null;
    let totalFiles = memJob?.total;
    let inputType = memJob?.inputType;

    if (!memJob && isDbConnected()) {
      const historyDoc = await ResizeJob.findOne({ jobId }).lean();
      if (historyDoc) {
        sourceBaseName = historyDoc.sourceName;
        status = historyDoc.status;
        createdAt = historyDoc.createdAt;
        totalFiles = historyDoc.totalFiles;
        inputType = historyDoc.inputType;
      }
    }

    jobs.push({
      jobId,
      sourceBaseName: sourceBaseName || jobId,
      inputType: inputType || null,
      status: status || 'unknown',
      totalFiles: totalFiles ?? null,
      sizeBytes,
      sizeLabel: formatBytes(sizeBytes),
      createdAt,
      // A job actively processing in this server's memory is the only case
      // we can be sure is unsafe to delete right now.
      canDelete: !(memJob && memJob.status === 'processing')
    });
  }

  jobs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const totalSizeBytes = jobs.reduce((sum, j) => sum + j.sizeBytes, 0);

  res.json({
    success: true,
    jobs,
    totalSizeBytes,
    totalSizeLabel: formatBytes(totalSizeBytes)
  });
}

module.exports = { listJobs };
