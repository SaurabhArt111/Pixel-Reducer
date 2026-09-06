import { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/Button';
import { Spinner } from '../components/Spinner';

const STATUS_COLORS = {
  completed: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  processing: { bg: 'var(--signal-soft)', fg: 'var(--signal)' },
  failed: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  uploaded: { bg: 'var(--panel-raised)', fg: 'var(--mute)' }
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.uploaded;
  return (
    <span className="pill-status" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getHistory({ search, status, page, limit: 20 });
        if (cancelled) return;
        setItems(data.items);
        setPages(data.pages);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, status, page]);

  return (
    <div className="page-container">
      <div className="page-head">
        <h1>History</h1>
        <p>Every batch you've processed, with its savings and a re-download link.</p>
      </div>

      <div className="history-toolbar">
        <div className="search-field">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search by source name…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error?.status === 503 ? (
        <div className="alert alert-warning">
          History is unavailable because the database isn't connected. Configure <code>MONGO_URI</code> in the
          server's <code>.env</code> file to enable it.
        </div>
      ) : error ? (
        <div className="alert alert-error">Could not load history: {error.message}</div>
      ) : null}

      {loading ? (
        <div className="empty-state">
          <Spinner size="lg" />
          <h3 style={{ marginTop: 16 }}>Loading history…</h3>
        </div>
      ) : items.length === 0 && !error ? (
        <div className="empty-state">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v5l3 2M21 12a9 9 0 1 1-9-9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3>No jobs yet</h3>
          <p>Batches you process will show up here.</p>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Width</th>
                  <th>Files</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.jobId}>
                    <td className="mono">{formatDate(job.createdAt)}</td>
                    <td className="source-name">{job.sourceName}</td>
                    <td className="mono">{job.targetWidth}px</td>
                    <td className="mono">
                      {job.processedFiles}/{job.totalFiles}
                    </td>
                    <td className="mono">
                      {(job.originalSize / (1024 * 1024)).toFixed(1)} MB →{' '}
                      {(job.outputSize / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td>
                      {job.status === 'completed' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(api.getDownloadUrl(job.jobId, 'zip'), '_blank')}
                        >
                          Download
                        </Button>
                      ) : (
                        <span className="control-hint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="page-label">
                Page {page} of {pages}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
