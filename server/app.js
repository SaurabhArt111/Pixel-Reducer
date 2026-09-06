const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const resizeRoutes = require('./routes/resizeRoutes');
const historyRoutes = require('./routes/historyRoutes');
const storageRoutes = require('./routes/storageRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Allow one or more comma-separated origins, e.g.
// CLIENT_URL=http://localhost:5173,http://192.168.1.20:5173
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, mobile apps) - allow.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // In development, also allow any origin on the local network (e.g.
      // testing from a phone at http://192.168.x.x:5173) so the app "just
      // works" across devices without CORS config for every LAN IP.
      if (process.env.NODE_ENV !== 'production') {
        const isLan = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );
        if (isLan) return callback(null, true);
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ['GET', 'POST', 'DELETE'],
    credentials: false
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Pixel Reducer API is running.' });
});

// History routes are mounted before the resize router's "/:jobId" catch-all
// so that GET /api/resize/history is never swallowed as a jobId lookup.
app.use('/api/resize/history', historyRoutes);
app.use('/api/resize', resizeRoutes);
app.use('/api/storage', storageRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
