const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const { TEMP_DIR, OUTPUT_DIR, JOB_RETENTION_HOURS } = require('../utils/constants');
const { removeDirSafe, ensureDir } = require('../utils/fileUtils');

async function sweepOnce() {
  const cutoff = Date.now() - JOB_RETENTION_HOURS * 60 * 60 * 1000;

  for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
    await ensureDir(dir);
    let entries = [];
    try {
      entries = await fsp.readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = await fsp.stat(fullPath);
        if (stat.mtimeMs < cutoff) {
          await removeDirSafe(fullPath);
        }
      } catch {
        // entry may have been removed concurrently - ignore
      }
    }
  }
}

function startCleanupSchedule() {
  // Run once on boot, then every hour.
  sweepOnce().catch((err) => console.error('Cleanup sweep failed:', err.message));
  setInterval(() => {
    sweepOnce().catch((err) => console.error('Cleanup sweep failed:', err.message));
  }, 60 * 60 * 1000);
}

module.exports = { startCleanupSchedule, sweepOnce };
