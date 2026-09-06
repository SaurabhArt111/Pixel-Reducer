const multer = require('multer');

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    let message = 'Upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'One or more files exceed the maximum allowed size.';
    if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files in this upload.';
    return res.status(400).json({ success: false, message, code: err.code });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 ? 'Something went wrong while processing your request.' : err.message;

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
