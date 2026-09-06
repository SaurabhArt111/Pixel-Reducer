import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const JobContext = createContext(null);
const STORAGE_KEY = 'pixelReducer.jobState.v1';
const POLL_INTERVAL_MS = 700;
const MAX_THUMBNAILS = 500;

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePersisted(data) {
  try {
    if (!data) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or storage disabled - persistence is a convenience,
    // not a hard requirement, so fail silently.
  }
}

function buildThumbnails(entries, manifestFiles) {
  const manifestSet = new Set(manifestFiles.map((f) => f.relativePath));
  const map = {};
  let count = 0;
  for (const { file, relativePath } of entries) {
    if (count >= MAX_THUMBNAILS) break;
    if (manifestSet.has(relativePath) && file.type && file.type.startsWith('image/')) {
      map[relativePath] = URL.createObjectURL(file);
      count += 1;
    }
  }
  return map;
}

const initialPersisted = loadPersisted();

export function JobProvider({ children }) {
  const [phase, setPhase] = useState(initialPersisted?.phase || 'empty'); // empty | staged | processing | completed
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(initialPersisted?.uploadResult || null);
  const [thumbnails, setThumbnails] = useState({});
  const [error, setError] = useState(null);
  const [rehydrating, setRehydrating] = useState(!!initialPersisted?.jobId);

  const [widthMode, setWidthMode] = useState(initialPersisted?.widthMode || 'preset');
  const [targetWidth, setTargetWidth] = useState(initialPersisted?.targetWidth || 3000);
  const [customWidth, setCustomWidth] = useState(initialPersisted?.customWidth || '3500');
  const [widthError, setWidthError] = useState(null);
  const [dontEnlarge, setDontEnlarge] = useState(
    initialPersisted?.dontEnlarge !== undefined ? initialPersisted.dontEnlarge : true
  );
  const [outputFormat, setOutputFormat] = useState(initialPersisted?.outputFormat || 'original');
  const [quality, setQuality] = useState(initialPersisted?.quality || 90);

  const [jobId, setJobId] = useState(initialPersisted?.jobId || null);
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const dismissedJobRef = useRef(initialPersisted?.dismissedJobId || null);

  const thumbUrlsRef = useRef([]);
  const pollTimerRef = useRef(null);

  // --- Rehydrate on mount: confirm the persisted job still exists server-side ---
  useEffect(() => {
    if (!initialPersisted?.jobId) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await api.getJob(initialPersisted.jobId);
        if (cancelled) return;

        // /api/resize/:jobId returns a differently-shaped "job" object
        // (status snapshot fields) than the original /upload response that
        // `uploadResult` normally holds - translate rather than merge blindly.
        setUploadResult((prev) => ({
          inputType: data.job.inputType,
          sourceBaseName: data.job.sourceBaseName,
          totalFiles: data.job.total,
          totalSize: data.job.originalSize,
          totalSizeLabel: data.job.originalSizeLabel,
          skipped: data.job.skipped || prev?.skipped || [],
          files: data.files && data.files.length > 0 ? data.files : prev?.files || []
        }));
        setJob(data.job);
        if (data.job.status === 'completed' || data.job.status === 'failed') {
          setPhase('completed');
          if (dismissedJobRef.current !== initialPersisted.jobId) {
            setModalOpen(true);
          }
        } else if (data.job.status === 'processing') {
          setPhase('processing');
        } else {
          setPhase('staged');
        }
      } catch {
        // The job no longer exists server-side (expired or the server restarted) - start fresh.
        if (!cancelled) {
          setPhase('empty');
          setUploadResult(null);
          setJobId(null);
          savePersisted(null);
        }
      } finally {
        if (!cancelled) setRehydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Poll for progress while processing, regardless of which page is shown ---
  useEffect(() => {
    if (phase !== 'processing' || !jobId) {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      return undefined;
    }

    let cancelled = false;

    async function poll() {
      try {
        const data = await api.getStatus(jobId);
        if (cancelled) return;
        setJob(data.job);

        if (data.job.status === 'completed' || data.job.status === 'failed') {
          setPhase('completed');
          if (dismissedJobRef.current !== jobId) {
            setModalOpen(true);
          }
        } else {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // transient network error - try again on the next tick
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS * 2);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [phase, jobId]);

  // --- Persist the resumable bits of state on every relevant change ---
  useEffect(() => {
    if (phase === 'empty' || !jobId) {
      savePersisted(null);
      return;
    }
    const filesForStorage = (uploadResult?.files || []).map((f) => ({
      relativePath: f.relativePath,
      size: f.size,
      width: f.width,
      height: f.height,
      format: f.format
    }));
    savePersisted({
      jobId,
      phase,
      uploadResult: uploadResult ? { ...uploadResult, files: filesForStorage } : null,
      widthMode,
      targetWidth,
      customWidth,
      dontEnlarge,
      outputFormat,
      quality,
      dismissedJobId: dismissedJobRef.current
    });
  }, [phase, jobId, uploadResult, widthMode, targetWidth, customWidth, dontEnlarge, outputFormat, quality]);

  // Revoke thumbnail object URLs on full unmount only
  useEffect(() => {
    return () => {
      thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function effectiveTargetWidth() {
    if (widthMode !== 'custom') return targetWidth;
    const n = Number(customWidth);
    return Number.isFinite(n) ? n : NaN;
  }

  function validateWidth() {
    const w = effectiveTargetWidth();
    if (!Number.isFinite(w) || w <= 0) {
      setWidthError('Enter a positive width in pixels.');
      return false;
    }
    if (w > 20000) {
      setWidthError('Width is too large (max 20,000px).');
      return false;
    }
    setWidthError(null);
    return true;
  }

  const handleFilesReady = useCallback(async (entries, inputType) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const data = await api.uploadFiles(entries, inputType, setUploadProgress);
      const urls = buildThumbnails(entries, data.files);
      thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      thumbUrlsRef.current = Object.values(urls);
      setThumbnails(urls);
      setUploadResult(data);
      setJobId(data.jobId);
      setJob(null);
      dismissedJobRef.current = null;
      setPhase('staged');
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!validateWidth()) return;
    setStarting(true);
    setError(null);
    try {
      await api.processJob(jobId, {
        targetWidth: effectiveTargetWidth(),
        dontEnlarge,
        outputFormat,
        quality
      });
      setPhase('processing');
    } catch (err) {
      setError(err.message || 'Could not start processing. Please try again.');
    } finally {
      setStarting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, widthMode, targetWidth, customWidth, dontEnlarge, outputFormat, quality]);

  const handleReset = useCallback(() => {
    thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    thumbUrlsRef.current = [];
    setThumbnails({});
    setUploadResult(null);
    setJobId(null);
    setJob(null);
    setError(null);
    setModalOpen(false);
    dismissedJobRef.current = null;
    setPhase('empty');
    savePersisted(null);
  }, []);

  const dismissModal = useCallback(() => {
    setModalOpen(false);
    dismissedJobRef.current = jobId;
  }, [jobId]);

  function getStatus(index, relativePath) {
    if (phase === 'staged') return 'ready';

    if (phase === 'processing' || phase === 'completed') {
      if (job?.failedFiles?.some((f) => f.file === relativePath)) return 'failed';
      if (phase === 'completed') return 'done';
      if (job) {
        if (index < job.processed) return 'done';
        if (index === job.processed) return 'processing';
      }
      return 'ready';
    }

    return 'ready';
  }

  const value = {
    phase,
    uploading,
    uploadProgress,
    uploadResult,
    thumbnails,
    error,
    rehydrating,
    widthMode,
    setWidthMode,
    targetWidth,
    setTargetWidth,
    customWidth,
    setCustomWidth,
    widthError,
    setWidthError,
    dontEnlarge,
    setDontEnlarge,
    outputFormat,
    setOutputFormat,
    quality,
    setQuality,
    jobId,
    starting,
    job,
    modalOpen,
    dismissModal,
    effectiveTargetWidth,
    handleFilesReady,
    handleProcess,
    handleReset,
    getStatus
  };

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJob must be used inside a JobProvider');
  return ctx;
}
