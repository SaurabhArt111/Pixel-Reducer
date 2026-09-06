const mongoose = require('mongoose');

const failedFileSchema = new mongoose.Schema(
  {
    file: { type: String, required: true },
    reason: { type: String, required: true }
  },
  { _id: false }
);

const resizeJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  sourceName: { type: String, required: true },
  inputType: { type: String, enum: ['single', 'multiple', 'folder', 'zip'], required: true },
  targetWidth: { type: Number, required: true },
  quality: { type: Number, default: 90 },
  outputFormat: { type: String, default: 'original' },
  dontEnlarge: { type: Boolean, default: true },
  totalFiles: { type: Number, default: 0 },
  processedFiles: { type: Number, default: 0 },
  failedFiles: { type: [failedFileSchema], default: [] },
  originalSize: { type: Number, default: 0 },
  outputSize: { type: Number, default: 0 },
  zipName: { type: String, default: null },
  singleImageName: { type: String, default: null },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  errorMessage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

resizeJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ResizeJob', resizeJobSchema);
