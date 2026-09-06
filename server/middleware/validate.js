const { OUTPUT_FORMATS } = require('../utils/constants');

function validateProcessRequest(req, res, next) {
  const { jobId, targetWidth, outputFormat, quality } = req.body;
  const errors = [];

  if (!jobId || typeof jobId !== 'string') {
    errors.push('jobId is required.');
  }

  const width = Number(targetWidth);
  if (!Number.isFinite(width) || width <= 0) {
    errors.push('targetWidth must be a positive number.');
  } else if (width > 20000) {
    errors.push('targetWidth is too large (max 20000px).');
  }

  if (outputFormat && !OUTPUT_FORMATS.includes(outputFormat)) {
    errors.push(`outputFormat must be one of: ${OUTPUT_FORMATS.join(', ')}`);
  }

  if (quality !== undefined) {
    const q = Number(quality);
    if (!Number.isFinite(q) || q < 1 || q > 100) {
      errors.push('quality must be a number between 1 and 100.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Invalid request.', errors });
  }

  req.validated = {
    jobId,
    targetWidth: Math.round(width),
    dontEnlarge: req.body.dontEnlarge === undefined ? true : req.body.dontEnlarge === true || req.body.dontEnlarge === 'true',
    outputFormat: outputFormat || 'original',
    quality: quality !== undefined ? Math.round(Number(quality)) : 90
  };

  next();
}

module.exports = { validateProcessRequest };
