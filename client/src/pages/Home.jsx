import UploadZone from '../components/UploadZone';
import WidthSelector from '../components/WidthSelector';
import FormatSelector from '../components/FormatSelector';
import QualityControl from '../components/QualityControl';
import FileQueue from '../components/FileQueue';
import ProcessingProgress from '../components/ProcessingProgress';
import ResultSummary from '../components/ResultSummary';
import Button from '../components/Button';
import { Spinner } from '../components/Spinner';
import { useJob } from '../context/JobContext';

export default function Home() {
  const {
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
    effectiveTargetWidth,
    handleFilesReady,
    handleProcess,
    handleReset,
    getStatus
  } = useJob();

  if (rehydrating) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Spinner size="lg" />
          <h3 style={{ marginTop: 16 }}>Restoring your last session…</h3>
          <p>Checking on your batch's progress.</p>
        </div>
      </div>
    );
  }

  const files = uploadResult?.files || [];
  const hasFiles = files.length > 0;
  const inputType = uploadResult?.inputType;

  return (
    <div className="page-container">
      {(phase === 'empty' || !hasFiles) && (
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
                disabled={phase !== 'staged'}
              />

              <FormatSelector value={outputFormat} onChange={setOutputFormat} disabled={phase !== 'staged'} />
              <QualityControl quality={quality} onChange={setQuality} disabled={phase !== 'staged'} />

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
