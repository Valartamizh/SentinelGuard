export default function EmptyState({
  icon: Icon,
  title = 'No records found',
  description = 'There are no items matching your criteria.',
  action,
}) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
      {Icon && (
        <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-color)] mb-3.5">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
