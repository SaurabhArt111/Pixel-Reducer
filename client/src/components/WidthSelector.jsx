const PRESETS = [3000, 4000, 6000];

export default function WidthSelector({
  targetWidth,
  isCustom,
  customValue,
  onSelectPreset,
  onCustomChange,
  dontEnlarge,
  onToggleEnlarge,
  error
}) {
  return (
    <div className="control-group">
      <div className="control-label">
        <span>Target width</span>
        <span className="control-hint">controls the resize</span>
      </div>
      <div className="width-options">
        {PRESETS.map((w) => (
          <button
            key={w}
            type="button"
            className={`width-pill ${!isCustom && targetWidth === w ? 'active' : ''}`}
            onClick={() => onSelectPreset(w)}
          >
            {w.toLocaleString()} px
          </button>
        ))}
        <button
          type="button"
          className={`width-pill ${isCustom ? 'active' : ''}`}
          onClick={() => onSelectPreset('custom')}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="width-custom">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 3500"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
          />
          <span className="suffix">px</span>
        </div>
      )}
      {error && <div className="field-error">{error}</div>}

      <div className="control-group">
        <label className="checkbox-row">
          <input type="checkbox" checked={dontEnlarge} onChange={(e) => onToggleEnlarge(e.target.checked)} />
          <span>Don't enlarge smaller images</span>
        </label>
      </div>
    </div>
  );
}
