import { useState, useEffect, useCallback } from 'react';
import { Server, RefreshCw, Database, ShieldCheck, Cpu, Radio } from 'lucide-react';
import { fetchHealth } from '../api/healthApi';

const POLL_INTERVAL_MS = 30_000;

export default function BackendStatusCard() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchHealth();
      setStatus('online');
    } catch {
      setStatus('offline');
    } finally {
      setLastChecked(new Date());
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const isOnline = status === 'online';

  return (
    <div id="backend-status-card" className="sentinel-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
              Backend Platform Health
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Central Orchestration Engine
            </p>
          </div>
        </div>

        <button
          id="refresh-health-btn"
          onClick={checkHealth}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh connection status"
          aria-label="Refresh health check"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Connection Indicator Banner */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${
            isOnline ? 'bg-[var(--status-success)] animate-pulse-subtle' : 'bg-[var(--status-critical)]'
          }`} />
          <span className="font-semibold text-[var(--text-primary)]">
            {status === 'checking' ? 'Verifying heartbeat...' : isOnline ? 'Connected (HTTP 200 OK)' : 'Backend Unreachable'}
          </span>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-mono">
          {lastChecked ? lastChecked.toLocaleTimeString() : '—'}
        </span>
      </div>

      {/* Technical Telemetry Grid */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 border-b border-[var(--border-color)]/50">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <Cpu className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Backend Engine:
          </span>
          <span className="font-mono text-[var(--text-primary)] font-semibold">
            Spring Boot 3 · Java 21
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 border-b border-[var(--border-color)]/50">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <Database className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Database Engine:
          </span>
          <span className="font-mono text-[var(--text-primary)] font-semibold">
            PostgreSQL 16 (Flyway V2)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 border-b border-[var(--border-color)]/50">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Security Architecture:
          </span>
          <span className="font-mono text-[var(--text-primary)] font-semibold">
            Stateless JWT Bearer
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <Radio className="w-3.5 h-3.5 text-[var(--status-success)]" />
            Agent Polling Window:
          </span>
          <span className="font-mono text-[var(--status-success)] font-semibold">
            30s Heartbeat / 90s Timeout
          </span>
        </div>
      </div>
    </div>
  );
}
