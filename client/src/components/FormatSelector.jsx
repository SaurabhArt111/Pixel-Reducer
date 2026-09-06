const FORMATS = [
  { id: 'original', label: 'Original' },
  { id: 'jpg', label: 'JPG' },
  { id: 'png', label: 'PNG' },
  { id: 'webp', label: 'WEBP' }
];

export default function FormatSelector({ value, onChange, disabled = false }) {
  return (
    <div className="control-group">
      <div className="control-label">
        <span>Output format</span>
      </div>
      <div className="segmented">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={disabled}
            className={value === f.id ? 'active' : ''}
            onClick={() => onChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
