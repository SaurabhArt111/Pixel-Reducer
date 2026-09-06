import Button from './Button';
import api from '../services/api';

export default function ResultSummary({ job, jobId, inputType, onReset }) {
  if (!job) return null;

  const isSingle = inputType === 'single' && job.singleImageName;

  return (
    <div className="panel result-panel">
      <div className="result-check">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>Processing complete</h2>
      <p className="sub">
        {job.processed} image{job.processed === 1 ? '' : 's'} processed
        {job.failed > 0 ? `, ${job.failed} failed` : ''}
      </p>

      <div className="result-stats">
        <div className="result-stat">
          <div className="num">{job.originalSizeLabel}</div>
          <div className="label">Original size</div>
        </div>
        <div className="result-stat">
          <div className="num">{job.outputSizeLabel}</div>
          <div className="label">Output size</div>
        </div>
        <div className="result-stat">
          <div className="num saved">{job.savedLabel}</div>
          <div className="label">Saved</div>
        </div>
      </div>

      <div className="result-actions">
        {isSingle && (
          <Button variant="primary" onClick={() => window.open(api.getDownloadUrl(jobId, 'image'), '_blank')}>
            Download Image
          </Button>
        )}
        <Button variant={isSingle ? 'secondary' : 'primary'} onClick={() => window.open(api.getDownloadUrl(jobId, 'zip'), '_blank')}>
          Download ZIP
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Start new batch
        </Button>
      </div>

      {job.zipName && <div className="zip-name-chip">{job.zipName}</div>}

      {job.failedFiles && job.failedFiles.length > 0 && (
        <details className="failed-list">
          <summary>{job.failedFiles.length} file(s) failed to process</summary>
          <ul>
            {job.failedFiles.map((f) => (
              <li key={f.file}>
                {f.file} — {f.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
