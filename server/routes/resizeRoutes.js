const express = require('express');
const router = express.Router();

const { upload, assignJobId } = require('../middleware/upload');
const { validateProcessRequest } = require('../middleware/validate');
const { uploadLimiter, processLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/resizeController');

router.post('/upload', uploadLimiter, assignJobId, upload.array('files'), controller.uploadFiles);
router.post('/process', processLimiter, validateProcessRequest, controller.processJob);
router.get('/status/:jobId', controller.getStatus);
router.get('/download/:jobId', controller.download);
router.get('/:jobId', controller.getJob);
router.delete('/:jobId', controller.deleteJob);

module.exports = router;
