const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const resizeRoutes = require('./routes/resizeRoutes');
const historyRoutes = require('./routes/historyRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: clientUrl,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: false
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Pixel Reducer API is running.' });
});

// History routes are mounted before the resize router's "/:jobId" catch-all
// so that GET /api/resize/history is never swallowed as a jobId lookup.
app.use('/api/resize/history', historyRoutes);
app.use('/api/resize', resizeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
