export default function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  loading = false,
  onClick,
  statusColor,
  accentBg
}) {
  return (
    <div
      onClick={onClick}
      className={`sentinel-card p-6 min-h-[140px] flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[var(--accent-primary)] hover:shadow-lg hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--text-secondary)] tracking-tight">
          {title}
        </span>
        {Icon && (
          <div 
            className="p-2.5 rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: accentBg || 'var(--bg-elevated)',
              borderColor: statusColor ? `${statusColor}33` : 'var(--border-color)',
              color: statusColor || 'var(--text-secondary)'
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="space-y-1 mt-3">
        {loading ? (
          <div className="h-9 w-20 bg-[var(--bg-elevated)] rounded-md animate-pulse" />
        ) : (
          <div 
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: statusColor || 'var(--text-primary)' }}
          >
            {value !== undefined && value !== null ? value : '0'}
          </div>
        )}

        {description && (
          <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed line-clamp-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
