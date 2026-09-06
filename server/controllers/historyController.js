const ResizeJob = require('../models/ResizeJob');
const { isDbConnected } = require('../config/db');

/** GET /api/resize/history?search=&status=&page=&limit= */
async function getHistory(req, res) {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'History is unavailable because the database is not connected.'
    });
  }

  const { search = '', status = '', page = 1, limit = 20 } = req.query;

  const query = {};
  if (search) {
    query.sourceName = { $regex: search, $options: 'i' };
  }
  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    ResizeJob.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    ResizeJob.countDocuments(query)
  ]);

  res.json({
    success: true,
    items,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1
  });
}

module.exports = { getHistory };
