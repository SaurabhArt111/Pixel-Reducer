# Pixel Reducer

A production-ready batch image resizer. Upload a single image, multiple images, a
folder, or a ZIP archive, pick a target **width**, and every image is resized to
that width with height calculated automatically from its original aspect ratio —
no cropping, no stretching, no distortion. Filenames and folder structure are
always preserved; only the pixel dimensions change.

Built as a MERN application:

- **Frontend:** React 18 + Vite, plain CSS (no Tailwind/CSS frameworks)
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose) — stores processing history only, never image binaries
- **Image processing:** Sharp
- **ZIP handling:** `archiver` (create) + `unzipper` (extract), both streaming

## Features

- Single image / multiple images / folder / ZIP upload, with drag-and-drop
- Target width presets (3000 / 4000 / 6000 px) or a custom width
- "Don't enlarge smaller images" (on by default)
- Output format: keep original, or convert everything to JPG / PNG / WEBP
- Adjustable quality (1–100) for lossy formats
- Original filenames and folder hierarchy are never changed — only the
  downloaded ZIP/image filename gets a `_<width>px` suffix
- Live per-file "Original → Output" dimension preview before you process
- Real processing progress (polled from the server — not simulated)
- Per-batch results: total processed/failed, size before/after, space saved
- Job history page backed by MongoDB, with search and status filtering
- Security: Helmet, CORS allow-list, rate limiting, MIME/extension validation,
  path-traversal and zip-slip protection, upload size limits
- Graceful error handling: corrupt ZIPs, empty ZIPs, unsupported files mixed
  into a batch, invalid input, etc. never crash a batch — failures are
  reported per-file

## Project structure

```
pixel-reducer/
├── server/                 Express API
│   ├── controllers/        Request handlers
│   ├── routes/              REST routes
│   ├── models/              Mongoose schema (ResizeJob)
│   ├── middleware/          Upload (Multer), validation, rate limiting, errors
│   ├── services/            Image processing, ZIP, job orchestration, cleanup
│   ├── utils/                Constants, sanitization, filesystem helpers
│   ├── uploads/ temp/ output/   Runtime working directories (empty at rest)
│   └── server.js / app.js
└── client/                 React + Vite frontend
    └── src/
        ├── components/      UploadZone, FileQueue, WidthSelector, etc.
        ├── pages/           Home, History
        ├── services/        api.js (fetch/XHR wrapper)
        ├── hooks/           useJobProgress (status polling)
        └── utils/           Client-side dimension math, drag-drop folder reader
```

## Requirements

- Node.js 18+
- MongoDB (local install or a free MongoDB Atlas cluster) — optional at
  runtime; without it, resizing still works, only the History page is
  disabled until `MONGO_URI` is configured

## Installation

```bash
# 1. Backend
cd server
npm install
cp .env.example .env
# edit .env if needed (MONGO_URI, PORT, CLIENT_URL, etc.)

# 2. Frontend
cd ../client
npm install
cp .env.example .env
```

## Environment setup

**server/.env**

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pixel-reducer
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=524288000
MAX_FILES=2000
UPLOAD_DIR=uploads
TEMP_DIR=temp
OUTPUT_DIR=output
JOB_RETENTION_HOURS=24
```

**client/.env**

```env
VITE_API_URL=/api
```

The frontend dev server proxies `/api` to `http://localhost:5000` (see
`client/vite.config.js`), so you normally don't need to change this in
development. Point it at a full URL when deploying frontend/backend separately.

## Running in development

```bash
# terminal 1
cd server
npm run dev      # nodemon, http://localhost:5000

# terminal 2
cd client
npm run dev       # http://localhost:5173
```

Open `http://localhost:5173`. If MongoDB isn't running, you'll see a warning
in the server logs — resizing still works, but the History page will show a
message that the database isn't connected.

## Production build

```bash
# Backend
cd server
npm install --omit=dev
NODE_ENV=production node server.js

# Frontend
cd client
npm run build      # outputs client/dist
npm run preview    # or serve client/dist with any static file server / CDN
```

In production, set `CLIENT_URL` on the backend to your deployed frontend's
origin (for CORS) and `VITE_API_URL` on the frontend to your deployed API's
base URL before building.

## How resizing works

- Width is the controlling dimension; height is always
  `round(width * originalHeight / originalWidth)`.
- "Don't enlarge" maps directly to Sharp's `withoutEnlargement` option, so an
  image already narrower than the target width is left at its original size.
- EXIF orientation is normalized (`sharp().rotate()`) before resizing, so
  photos from phones/cameras always come out right-side up.
- Naming: only the **downloaded** ZIP or single-image filename gets a
  `_<width>px` suffix (e.g. `Premium_Laminates_3000px.zip`,
  `ABC001_3000px.jpg`). Every file *inside* the ZIP keeps its original name
  and folder path.

## Notes on scale

- Uploads are streamed to disk (never held fully in memory); ZIP extraction
  and creation are both stream-based.
- Image processing runs with bounded concurrency (4 at a time) so large
  batches don't saturate CPU/RAM.
- A background sweep removes job working files older than
  `JOB_RETENTION_HOURS` (default 24h) from `temp/` and `output/`.
