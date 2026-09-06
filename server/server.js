require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { startCleanupSchedule } = require('./services/cleanupService');
const { ensureDir } = require('./utils/fileUtils');
const { UPLOAD_DIR, TEMP_DIR, OUTPUT_DIR } = require('./utils/constants');

const PORT = process.env.PORT || 5000;

async function start() {
  await Promise.all([ensureDir(UPLOAD_DIR), ensureDir(TEMP_DIR), ensureDir(OUTPUT_DIR)]);

  await connectDB();
  startCleanupSchedule();

  app.listen(PORT, () => {
    console.log(`🚀 Pixel Reducer API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
