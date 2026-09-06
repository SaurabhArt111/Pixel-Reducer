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
- **Progress survives reloads, tab close, and navigating around the app.**
  Your active/staged/processing/completed batch lives in a React context
  above the router (so switching between Home → History → Storage never
  clears it) and is mirrored to `localStorage` + reconciled against the
  server on load (so a reload or reopened tab picks up exactly where you
  left off, as long as the backend process is still running).
- An in-app **completion popup** (not a browser dialog) appears the moment
  a batch finishes — with Download ZIP / Download Image / Start New Batch
  actions — even if you've navigated away to History or Storage while it
  was processing.
- Per-batch results: total processed/failed, size before/after, space saved
- Job history page backed by MongoDB, with search and status filtering
- **Storage page**: browse every job's working files on disk (under
  `server/temp/` and the generated ZIPs under `server/output/`), see how
  much space each is using, and delete completed ones — jobs that are
  still actively processing can't be deleted until they finish
- Left sidebar navigation (collapses into a slide-out drawer on mobile)
- Works across your local network out of the box: the backend binds to all
  interfaces and logs its LAN URL on startup, the Vite dev server does the
  same, and CORS allows any local-network origin in development
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
│   ├── uploads/              All runtime working files live here (empty at rest)
│   │   ├── temp/               Per-job working directory while a batch is processed
│   │   └── output/             Final downloadable ZIPs
│   └── server.js / app.js
└── client/                 React + Vite frontend
    └── src/
        ├── components/      UploadZone, FileQueue, Sidebar, CompletionModal, etc.
        ├── context/         JobContext (global, persisted job/upload state)
        ├── pages/           Home, History, Storage
        ├── services/        api.js (fetch/XHR wrapper)
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
TEMP_DIR=uploads/temp
OUTPUT_DIR=uploads/output
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

## Using it from another device on your network

Both dev servers bind to all network interfaces, so you can open the app
from your phone or another computer on the same Wi-Fi/LAN:

1. Start both servers as above. The backend logs a line like
   `Also reachable on your network at http://192.168.1.20:5000`, and Vite
   prints a `Network:` URL the same way.
2. On the other device, open the frontend's LAN URL
   (e.g. `http://192.168.1.20:5173`) — it talks to the backend through
   Vite's dev proxy automatically, no extra configuration needed.
3. In development, the backend's CORS allows any private-network origin, so
   this works without editing `.env`. For a production deployment across
   different hosts, set `CLIENT_URL` to the real origin(s) instead (comma-
   separated if there's more than one), since the LAN allowance only
   applies when `NODE_ENV` isn't `production`.

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
  `JOB_RETENTION_HOURS` (default 24h) from `uploads/temp/` and `uploads/output/`.

## Notes on state persistence

- Active/staged/processing/completed batch state lives in a React context
  above the router, so it survives navigating between Home, History and
  Storage without being cleared.
- It's also mirrored to `localStorage` and reconciled against the backend
  on load, so reloading the tab or closing and reopening it picks up right
  where you left off — as long as the same backend process is still
  running. If the Node process itself restarts while a job is mid-flight,
  that specific in-progress job can't be resumed (its in-memory progress is
  gone), though completed jobs remain downloadable from History/Storage
  since their ZIP and database record persist independently.
- Thumbnails are generated client-side from the originally selected files,
  so they won't reappear after a reload (the browser no longer has the
  original file handles) — the file list itself, dimensions and processing
  status all still restore correctly.
