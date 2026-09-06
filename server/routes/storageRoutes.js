const express = require('express');
const router = express.Router();
const { listJobs } = require('../controllers/storageController');

router.get('/jobs', listJobs);

module.exports = router;
