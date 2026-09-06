const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn('⚠️  MONGO_URI is not set. History will be unavailable until it is configured.');
    return;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('MongoDB connection error:', err.message);
  });

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    // Non-fatal: image resizing does not depend on MongoDB, only history persistence does.
    console.error('❌ Could not connect to MongoDB:', err.message);
    console.error('   The app will keep running - resizing works, but job history will not be saved.');
  }
}

function isDbConnected() {
  return isConnected;
}

module.exports = { connectDB, isDbConnected };
