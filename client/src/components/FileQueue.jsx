import { useEffect, useRef } from 'react';
import { computeOutputDimensions, formatBytes } from '../utils/dimensions';
import { useVirtualList } from '../hooks/useVirtualList';
import { useJob } from '../context/JobContext';

// Kept in sync with the fixed `.queue-row` height in index.css - both need
// to agree for the virtualized positioning math to line up with what's
// actually rendered.
const ROW_HEIGHT = 68;

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
        <span className="queue-dims-full">{item.width ? `${item.width}×${item.height}` : '—'}</span>
        <span className="arrow queue-dims-full">→</span>
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
  const { requestThumbnails } = useJob();
  const { containerRef, startIndex, endIndex, totalHeight, offsetY } = useVirtualList({
    itemCount: files.length,
    rowHeight: ROW_HEIGHT,
    overscan: 10
  });

  const visible = files.slice(startIndex, endIndex);

  // Only decode thumbnails for what's actually on screen right now. Debounced
  // slightly so a fast scroll settles before kicking off decode work, rather
  // than requesting a new batch on every intermediate frame.
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      requestThumbnails(visible.map((f) => ({ relativePath: f.relativePath, width: f.width, height: f.height })));
    }, 120);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex, endIndex, files]);

  return (
    <div>
      <div className="queue-meta">
        <span className="count">Files detected: {files.length.toLocaleString()}</span>
        <span className="size">Total size: {totalSizeLabel}</span>
      </div>

      <div className="queue-viewport" ref={containerRef}>
        <div className="queue-sizer" style={{ height: totalHeight }}>
          <div className="queue" style={{ transform: `translateY(${offsetY}px)` }}>
            {visible.map((item, i) => {
              const index = startIndex + i;
              return (
                <Row
                  key={item.relativePath}
                  item={item}
                  thumb={thumbnails[item.relativePath]}
                  targetWidth={targetWidth}
                  dontEnlarge={dontEnlarge}
                  status={getStatus(index, item.relativePath)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
