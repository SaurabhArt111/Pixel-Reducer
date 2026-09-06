import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import Button from '../components/Button';
import { Spinner } from '../components/Spinner';

const STATUS_COLORS = {
  completed: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  processing: { bg: 'var(--signal-soft)', fg: 'var(--signal)' },
  failed: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  uploaded: { bg: 'var(--panel-raised)', fg: 'var(--mute)' },
  unknown: { bg: 'var(--panel-raised)', fg: 'var(--mute)' }
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  return (
    <span className="pill-status" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function DeleteButton({ job, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!job.canDelete) {
    return (
      <span className="control-hint" title="Can't delete a job while it's still processing">
        Processing…
      </span>
    );
  }

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setDeleteError(null);
      timerRef.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(timerRef.current);
    setDeleting(true);
    try {
      await api.deleteJob(job.jobId);
      onDeleted(job.jobId);
    } catch (err) {
      setDeleteError(err.message || 'Could not delete this job.');
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant={confirming ? 'danger' : 'secondary'} loading={deleting} onClick={handleClick}>
        {confirming ? 'Confirm delete?' : 'Delete'}
      </Button>
      {deleteError && <div className="field-error">{deleteError}</div>}
    </div>
  );
}

export default function Storage() {
  const [jobs, setJobs] = useState([]);
  const [totalSizeLabel, setTotalSizeLabel] = useState('0 MB');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.getStorageJobs();
      setJobs(data.jobs);
      setTotalSizeLabel(data.totalSizeLabel);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 6000);
    return () => clearInterval(interval);
  }, [load]);

  function handleDeleted(jobId) {
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }

  const hasProcessing = jobs.some((j) => j.status === 'processing');

  return (
    <div className="page-container">
      <div className="page-head">
        <h1>Storage</h1>
        <p>Everything currently on disk under the server's <code>uploads/temp</code> and <code>uploads/output</code> folders.</p>
      </div>

      <div className="queue-meta">
        <span className="count">{jobs.length} job folder{jobs.length === 1 ? '' : 's'} on disk</span>
        <span className="size">Total: {totalSizeLabel}</span>
      </div>

      {hasProcessing && (
        <div className="alert alert-warning">
          A job is currently processing — its folder can't be deleted until it finishes.
        </div>
      )}
      {error && <div className="alert alert-error">Could not load storage: {error.message}</div>}

      {loading ? (
        <div className="empty-state">
          <Spinner size="lg" />
          <h3 style={{ marginTop: 16 }}>Scanning disk…</h3>
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3>Nothing on disk</h3>
          <p>Uploaded and processed files will show up here until cleaned up.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Files</th>
                <th>Size</th>
                <th>Status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.jobId}>
                  <td className="source-name">{job.sourceBaseName}</td>
                  <td className="mono">{job.inputType || '—'}</td>
                  <td className="mono">{job.totalFiles ?? '—'}</td>
                  <td className="mono">{job.sizeLabel}</td>
                  <td>
                    <StatusPill status={job.status} />
                  </td>
                  <td>
                    <DeleteButton job={job} onDeleted={handleDeleted} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
