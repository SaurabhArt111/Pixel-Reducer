import { useState } from 'react';
import { computeOutputDimensions, formatBytes } from '../utils/dimensions';

const PAGE_SIZE = 60;

const STATUS_LABEL = {
  ready: 'Ready',
  processing: 'Processing',
  done: 'Done',
  failed: 'Failed'
};

function Row({ item, thumb, targetWidth, dontEnlarge, status }) {
  const output = computeOutputDimensions(item.width, item.height, targetWidth, dontEnlarge);
  const folder = item.relativePath.includes('/') ? item.relativePath.split('/').slice(0, -1).join('/') : null;

  return (
    <div className={`queue-row ${status === 'processing' ? 'is-active' : ''}`}>
      {thumb ? (
        <img src={thumb} alt="" className="queue-thumb" loading="lazy" />
      ) : (
        <div className="queue-thumb" />
      )}
      <div className="queue-info">
        <div className="queue-name" title={item.relativePath}>
          {item.relativePath.split('/').pop()}
        </div>
        {folder ? <div className="queue-path">{folder}/</div> : <div className="queue-path">{formatBytes(item.size)}</div>}
      </div>
      <div className="queue-dims">
        <span>{item.width ? `${item.width}×${item.height}` : '—'}</span>
        <span className="arrow">→</span>
        <span>{output.width ? `${output.width}×${output.height}` : '—'}</span>
      </div>
      <span className={`queue-status status-${status}`}>{STATUS_LABEL[status]}</span>
    </div>
  );
}

export default function FileQueue({
  files,
  thumbnails,
  targetWidth,
  dontEnlarge,
  totalSizeLabel,
  getStatus
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? files : files.slice(0, PAGE_SIZE);

  return (
    <div>
      <div className="queue-meta">
        <span className="count">
          Files detected: {files.length.toLocaleString()}
        </span>
        <span className="size">Total size: {totalSizeLabel}</span>
      </div>

      <div className="queue">
        {visible.map((item, index) => (
          <Row
            key={item.relativePath}
            item={item}
            thumb={thumbnails[item.relativePath]}
            targetWidth={targetWidth}
            dontEnlarge={dontEnlarge}
            status={getStatus(index, item.relativePath)}
          />
        ))}
      </div>

      {files.length > PAGE_SIZE && !expanded && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)}>
            Show all {files.length.toLocaleString()} files
          </button>
        </div>
      )}
    </div>
  );
}
