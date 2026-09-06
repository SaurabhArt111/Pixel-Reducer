const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads from this address. Please try again later.' }
});

const processLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many processing requests. Please try again later.' }
});

module.exports = { uploadLimiter, processLimiter };
