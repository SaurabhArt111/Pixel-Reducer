export default function QualityControl({ quality, onChange }) {
  return (
    <div className="control-group">
      <div className="control-label">
        <span>Quality</span>
        <span className="control-hint">JPG, WEBP &amp; PNG</span>
      </div>
      <div className="quality-row">
        <input
          type="range"
          min="1"
          max="100"
          value={quality}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="quality-value">{quality}</span>
      </div>
    </div>
  );
}
