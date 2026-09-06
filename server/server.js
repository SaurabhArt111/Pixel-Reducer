require('dotenv').config();

const os = require('os');
const app = require('./app');
const { connectDB } = require('./config/db');
const { startCleanupSchedule } = require('./services/cleanupService');
const { ensureDir } = require('./utils/fileUtils');
const { UPLOAD_DIR, TEMP_DIR, OUTPUT_DIR } = require('./utils/constants');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

async function start() {
  await Promise.all([ensureDir(UPLOAD_DIR), ensureDir(TEMP_DIR), ensureDir(OUTPUT_DIR)]);

  await connectDB();
  startCleanupSchedule();

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Pixel Reducer API listening on http://localhost:${PORT}`);
    getLanAddresses().forEach((addr) => {
      console.log(`   Also reachable on your network at http://${addr}:${PORT}`);
    });
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
