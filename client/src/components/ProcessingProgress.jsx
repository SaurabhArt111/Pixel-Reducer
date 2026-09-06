import { Spinner } from './Spinner';

export default function ProcessingProgress({ job }) {
  if (!job) {
    return (
      <div className="progress-panel">
        <div className="progress-title">
          <Spinner />
          <span>Starting up…</span>
        </div>
      </div>
    );
  }

  const pct = job.total > 0 ? Math.round(((job.processed + job.failed) / job.total) * 100) : 0;
  const remaining = Math.max(0, job.total - job.processed - job.failed);

  return (
    <div className="progress-panel">
      <div className="progress-head">
        <div className="progress-title">
          <Spinner />
          <span>Processing…</span>
        </div>
        <span className="progress-pct">{pct}%</span>
      </div>

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {job.currentFile && (
        <div className="progress-current">
          <span className="file">{job.currentFile}</span>
          {job.currentOriginalDims && job.currentOutputDims && (
            <span className="dims">
              {job.currentOriginalDims.width}×{job.currentOriginalDims.height} → {job.currentOutputDims.width}×
              {job.currentOutputDims.height}
            </span>
          )}
        </div>
      )}

      <div className="progress-stats">
        <div className="progress-stat">
          <div className="num">{job.processed}</div>
          <div className="label">Processed</div>
        </div>
        <div className="progress-stat">
          <div className="num">{remaining}</div>
          <div className="label">Remaining</div>
        </div>
        <div className="progress-stat">
          <div className={`num ${job.failed > 0 ? 'failed-num' : ''}`}>{job.failed}</div>
          <div className="label">Failed</div>
        </div>
      </div>
    </div>
  );
}
