import { useEffect, useRef, useState } from 'react';
import UploadZone from '../components/UploadZone';
import WidthSelector from '../components/WidthSelector';
import FormatSelector from '../components/FormatSelector';
import QualityControl from '../components/QualityControl';
import FileQueue from '../components/FileQueue';
import ProcessingProgress from '../components/ProcessingProgress';
import ResultSummary from '../components/ResultSummary';
import Button from '../components/Button';
import api from '../services/api';
import { useJobProgress } from '../hooks/useJobProgress';

const MAX_THUMBNAILS = 500;

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

export default function Home() {
  const [phase, setPhase] = useState('empty'); // empty | staged | processing | completed
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [thumbnails, setThumbnails] = useState({});
  const [error, setError] = useState(null);

  const [widthMode, setWidthMode] = useState('preset');
  const [targetWidth, setTargetWidth] = useState(3000);
  const [customWidth, setCustomWidth] = useState('3500');
  const [widthError, setWidthError] = useState(null);
  const [dontEnlarge, setDontEnlarge] = useState(true);
  const [outputFormat, setOutputFormat] = useState('original');
  const [quality, setQuality] = useState(90);

  const [jobId, setJobId] = useState(null);
  const [starting, setStarting] = useState(false);

  const thumbUrlsRef = useRef([]);

  const { job } = useJobProgress(jobId, phase === 'processing');

  useEffect(() => {
    if (!job) return;
    if (job.status === 'completed' || job.status === 'failed') {
      setPhase('completed');
    }
  }, [job]);

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

  async function handleFilesReady(entries, inputType) {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const data = await api.uploadFiles(entries, inputType, setUploadProgress);
      const urls = buildThumbnails(entries, data.files);
      thumbUrlsRef.current = Object.values(urls);
      setThumbnails(urls);
      setUploadResult(data);
      setJobId(data.jobId);
      setPhase('staged');
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
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
  }

  function handleReset() {
    thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    thumbUrlsRef.current = [];
    setThumbnails({});
    setUploadResult(null);
    setJobId(null);
    setError(null);
    setPhase('empty');
  }

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

  const files = uploadResult?.files || [];
  const hasFiles = files.length > 0;
  const inputType = uploadResult?.inputType;

  return (
    <div className="page-container">
      {phase === 'empty' && (
        <>
          <div className="page-head">
            <h1>Image Pixel Reducer</h1>
            <p>Batch-resize images by target width — aspect ratio, filenames and folder structure always preserved.</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <UploadZone onFilesReady={handleFilesReady} uploading={uploading} uploadProgress={uploadProgress} />
        </>
      )}

      {phase !== 'empty' && hasFiles && (
        <div className="home-grid">
          <aside className="sidebar">
            <div className="panel">
              <div className="panel-title">
                <span>Settings</span>
                {uploadResult?.sourceBaseName && (
                  <span className="control-hint">{uploadResult.sourceBaseName}</span>
                )}
              </div>

              <WidthSelector
                targetWidth={targetWidth}
                isCustom={widthMode === 'custom'}
                customValue={customWidth}
                onSelectPreset={(w) => {
                  if (w === 'custom') {
                    setWidthMode('custom');
                  } else {
                    setWidthMode('preset');
                    setTargetWidth(w);
                  }
                  setWidthError(null);
                }}
                onCustomChange={(v) => {
                  setCustomWidth(v);
                  setWidthError(null);
                }}
                dontEnlarge={dontEnlarge}
                onToggleEnlarge={setDontEnlarge}
                error={widthError}
              />

              <FormatSelector value={outputFormat} onChange={setOutputFormat} />
              <QualityControl quality={quality} onChange={setQuality} />

              <div className="control-group">
                {phase === 'staged' && (
                  <Button block loading={starting} onClick={handleProcess}>
                    Process {files.length.toLocaleString()} image{files.length === 1 ? '' : 's'}
                  </Button>
                )}
                {(phase === 'processing' || phase === 'completed') && (
                  <Button block variant="secondary" onClick={handleReset}>
                    Start new batch
                  </Button>
                )}
              </div>
            </div>
          </aside>

          <div className="main-col">
            {error && <div className="alert alert-error">{error}</div>}
            {uploadResult?.skipped?.length > 0 && (
              <div className="alert alert-warning">
                {uploadResult.skipped.length} unsupported file(s) were skipped.
              </div>
            )}

            {phase === 'processing' && <ProcessingProgress job={job} />}
            {phase === 'completed' && (
              <ResultSummary job={job} jobId={jobId} inputType={inputType} onReset={handleReset} />
            )}

            <FileQueue
              files={files}
              thumbnails={thumbnails}
              targetWidth={effectiveTargetWidth() || targetWidth}
              dontEnlarge={dontEnlarge}
              totalSizeLabel={uploadResult?.totalSizeLabel}
              getStatus={getStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
}
