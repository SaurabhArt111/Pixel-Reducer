export function Spinner({ size = 'md' }) {
  return <span className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} aria-hidden="true" />;
}

export function LoadingRows({ count = 4 }) {
  return (
    <div className="queue">
      {Array.from({ length: count }).map((_, i) => (
        <div className="queue-row" key={i}>
          <div className="skeleton" style={{ width: 48, height: 48 }} />
          <div>
            <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '35%', height: 10 }} />
          </div>
          <div className="skeleton" style={{ width: 90, height: 12 }} />
          <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}
