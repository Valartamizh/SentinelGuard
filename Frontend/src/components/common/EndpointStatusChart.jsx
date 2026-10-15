import { Activity, ShieldCheck, ShieldAlert, Radio } from 'lucide-react';

export default function EndpointStatusChart({
  total = 0,
  online = 0,
  offline = 0,
  revoked = 0,
  loading = false,
  onNavigate
}) {
  // SVG Donut Math
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42

  const safeTotal = total > 0 ? total : 0;
  const onlinePct = safeTotal > 0 ? Math.round((online / safeTotal) * 100) : 0;
  const offlinePct = safeTotal > 0 ? Math.round((offline / safeTotal) * 100) : 0;
  const revokedPct = safeTotal > 0 ? Math.max(0, 100 - onlinePct - offlinePct) : 0;

  const onlineLen = safeTotal > 0 ? (online / safeTotal) * circumference : 0;
  const offlineLen = safeTotal > 0 ? (offline / safeTotal) * circumference : 0;
  const revokedLen = safeTotal > 0 ? (revoked / safeTotal) * circumference : 0;

  const offlineOffset = -onlineLen;
  const revokedOffset = -(onlineLen + offlineLen);

  const categories = [
    {
      id: 'online',
      label: 'Online',
      count: online,
      pct: onlinePct,
      color: 'var(--status-success)',
      bg: 'var(--status-success-bg)',
      border: 'var(--status-success-border)',
      icon: Activity
    },
    {
      id: 'offline',
      label: 'Offline',
      count: offline,
      pct: offlinePct,
      color: 'var(--status-warning)',
      bg: 'var(--status-warning-bg)',
      border: 'var(--status-warning-border)',
      icon: ShieldCheck
    },
    {
      id: 'revoked',
      label: 'Revoked',
      count: revoked,
      pct: revokedPct,
      color: 'var(--status-critical)',
      bg: 'var(--status-critical-bg)',
      border: 'var(--status-critical-border)',
      icon: ShieldAlert
    }
  ];

  return (
    <div className="sentinel-card p-6 h-full flex flex-col justify-between transition-all duration-200">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Endpoint Status Distribution
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              Live fleet connectivity &amp; health breakdown
            </p>
          </div>
        </div>

        {safeTotal > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
            <span>{onlinePct}% Connected</span>
          </span>
        )}
      </div>

      {/* ── Donut Chart & Visual Breakdown ── */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        
        {/* Left: Donut SVG Graphic (5 cols) */}
        <div className="sm:col-span-5 flex items-center justify-center relative">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {loading ? (
              <div className="w-32 h-32 rounded-full border-4 border-t-[var(--accent-primary)] border-[var(--border-color)] animate-spin" />
            ) : (
              <>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Subtle Background Ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="var(--border-color)"
                    strokeWidth="13"
                    fill="none"
                    opacity="0.3"
                  />

                  {safeTotal === 0 ? (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="var(--text-muted)"
                      strokeWidth="13"
                      strokeDasharray="6 6"
                      fill="none"
                      opacity="0.3"
                    />
                  ) : (
                    <>
                      {/* Online Arc */}
                      {onlineLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke="var(--status-success)"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${onlineLen} ${circumference}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      )}

                      {/* Offline Arc */}
                      {offlineLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke="var(--status-warning)"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${offlineLen} ${circumference}`}
                          strokeDashoffset={offlineOffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      )}

                      {/* Revoked Arc */}
                      {revokedLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke="var(--status-critical)"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${revokedLen} ${circumference}`}
                          strokeDashoffset={revokedOffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      )}
                    </>
                  )}
                </svg>

                {/* Center Stats Inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                  <span className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    {safeTotal}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                    {safeTotal === 1 ? 'Device' : 'Devices'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Legend & Percentage Progress Bars (7 cols) */}
        <div className="sm:col-span-7 space-y-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div 
                key={cat.id} 
                onClick={() => onNavigate && onNavigate('devices')}
                className="p-2.5 rounded-xl bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cat.color }} />
                    <span className="text-[var(--text-primary)] font-medium">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {cat.count}
                    </span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: cat.bg, color: cat.color }}>
                      {cat.pct}%
                    </span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-[var(--border-color)]/50 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${safeTotal > 0 ? cat.pct : 0}%`,
                      backgroundColor: cat.color 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Footer Link ── */}
      <div className="pt-2 border-t border-[var(--border-color)]/40 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Sub-90s continuous telemetry verification</span>
        <button
          onClick={() => onNavigate && onNavigate('devices')}
          className="text-xs font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Inspect fleet</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
