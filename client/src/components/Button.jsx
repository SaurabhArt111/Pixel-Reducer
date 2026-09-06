export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  type = 'button',
  onClick,
  className = ''
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
