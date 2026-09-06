/**
 * Lightweight in-memory store for live job progress.
 *
 * MongoDB holds durable job history, but polling the DB on every
 * progress tick would be wasteful and slow. Instead the active
 * processing state lives here, and the final snapshot is persisted
 * to MongoDB once a job completes or fails.
 */

const jobs = new Map();

function createJob(jobId, initial) {
  jobs.set(jobId, {
    jobId,
    status: 'uploaded',
    total: 0,
    processed: 0,
    failed: 0,
    currentFile: null,
    currentOriginalDims: null,
    currentOutputDims: null,
    failedFiles: [],
    originalSize: 0,
    outputSize: 0,
    zipName: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...initial
  });
  return jobs.get(jobId);
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}

function deleteJob(jobId) {
  jobs.delete(jobId);
}

function allJobs() {
  return Array.from(jobs.values());
}

module.exports = { createJob, getJob, updateJob, deleteJob, allJobs };
