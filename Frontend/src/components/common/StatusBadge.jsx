export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  if (normalized === 'ONLINE') {
    return (
      <span className="badge-online">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse-subtle" />
        ONLINE
      </span>
    );
  }

  if (normalized === 'OFFLINE') {
    return (
      <span className="badge-offline">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" />
        OFFLINE
      </span>
    );
  }

  if (normalized === 'REVOKED') {
    return (
      <span className="badge-revoked">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-critical)]" />
        REVOKED
      </span>
    );
  }

  if (normalized === 'ACTIVE') {
    return (
      <span className="badge-online">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
        ACTIVE
      </span>
    );
  }

  if (normalized === 'INACTIVE' || normalized === 'RETIRED') {
    return (
      <span className="badge-neutral">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-neutral)]" />
        {normalized}
      </span>
    );
  }

  return (
    <span className="badge-neutral">
      {status}
    </span>
  );
}
