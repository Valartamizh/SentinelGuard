import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Laptop, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  KeyRound, 
  Plus, 
  ArrowRight,
  Layers,
  Shield,
  Radio,
  Lock,
  ChevronRight
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import EndpointStatusChart from '../components/common/EndpointStatusChart';
import BackendStatusCard from '../components/BackendStatusCard';
import { adminApi } from '../api/adminApi';

export default function DashboardPage({ onNavigate }) {
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    revokedDevices: 0
  });
  const [recentDevices, setRecentDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setFetchError(null);
      const [sumData, devData] = await Promise.all([
        adminApi.getDashboardSummary(),
        adminApi.getDevices()
      ]);
      setSummary(sumData);
      setRecentDevices(devData.slice(0, 5));
    } catch (err) {
      if (err.response?.status === 401) {
        // Session expired, apiClient handles redirect event
        return;
      }
      console.warn('Dashboard data refresh notice:', err.message);
      setFetchError('Telemetry update in progress...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border-color)]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Security Overview
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
              Live Telemetry Stream
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Central operations dashboard for monitored Windows endpoints, personnel bindings, and connectivity state.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); fetchDashboardData(); }}
            disabled={refreshing}
            className="btn-secondary h-10 px-4 text-xs font-semibold"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('enrollment')}
            className="btn-primary h-10 px-4.5 text-xs font-semibold shadow-md shadow-blue-600/20"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Enroll Endpoint</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3.5 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning)] text-xs flex items-center justify-between">
          <span>{fetchError}</span>
          <button onClick={fetchDashboardData} className="underline font-semibold cursor-pointer">Retry</button>
        </div>
      )}

      {/* ── 2. High-Impact KPI Metrics & Fleet Distribution ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Side (7 cols on XL): 4 KPI Metric Cards in a balanced 2x2 grid */}
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="Total Personnel"
            value={summary.totalEmployees}
            icon={Users}
            description="Active organizational directory"
            loading={loading}
            accentBg="rgba(37, 99, 235, 0.12)"
            statusColor="var(--accent-primary)"
            onClick={() => onNavigate('employees')}
          />

          <MetricCard
            title="Bound Endpoints"
            value={summary.totalDevices}
            icon={Laptop}
            description="Hardware credentials via DPAPI"
            loading={loading}
            accentBg="rgba(8, 145, 178, 0.12)"
            statusColor="#0891B2"
            onClick={() => onNavigate('devices')}
          />

          <MetricCard
            title="Online Endpoints"
            value={summary.onlineDevices}
            icon={Activity}
            description="Active within 90s heartbeat"
            loading={loading}
            accentBg="rgba(34, 197, 94, 0.12)"
            statusColor="var(--status-success)"
            onClick={() => onNavigate('devices')}
          />

          <MetricCard
            title="Revoked Endpoints"
            value={summary.revokedDevices}
            icon={ShieldAlert}
            description="Credentials invalidated"
            loading={loading}
            accentBg="rgba(239, 68, 68, 0.12)"
            statusColor="var(--status-critical)"
            onClick={() => onNavigate('devices')}
          />
        </div>

        {/* Right Side (5 cols on XL): Endpoint Status Donut Breakdown Chart */}
        <div className="xl:col-span-5">
          <EndpointStatusChart
            total={summary.totalDevices}
            online={summary.onlineDevices}
            offline={summary.offlineDevices}
            revoked={summary.revokedDevices}
            loading={loading}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* ── 3. Balanced Main Section: 7-Column / 5-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column (7 cols): Endpoint Inventory & Quick Actions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Endpoint Inventory Table */}
          <div className="sentinel-card overflow-hidden">
            <div className="px-6 py-4.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Active Endpoint Inventory
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Latest monitored devices and live connection telemetry
                </p>
              </div>

              <button
                onClick={() => onNavigate('devices')}
                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all endpoints</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-[var(--text-muted)]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent-primary)] mb-2" />
                <span>Loading endpoint inventory telemetry...</span>
              </div>
            ) : recentDevices.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Laptop className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">No endpoints enrolled</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Generate a one-time enrollment token to register your Windows agent client.
                </p>
                <button
                  onClick={() => onNavigate('enrollment')}
                  className="btn-primary text-xs px-4 py-2 mt-2"
                >
                  Enroll First Device
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/40 text-[var(--text-secondary)] text-xs font-semibold">
                      <th className="py-3.5 px-6">Endpoint</th>
                      <th className="py-3.5 px-6">Personnel</th>
                      <th className="py-3.5 px-6">OS Platform</th>
                      <th className="py-3.5 px-6">State</th>
                      <th className="py-3.5 px-6 text-right">Last Telemetry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {recentDevices.map((dev) => (
                      <tr 
                        key={dev.id} 
                        className="h-[60px] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                        onClick={() => onNavigate('devices')}
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                            {dev.hostname}
                          </div>
                          <div className="font-mono text-xs text-[var(--accent-primary)] mt-0.5">
                            {dev.deviceCode}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="text-[var(--text-primary)] font-medium">
                            {dev.employeeName}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {dev.departmentName || 'General'}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)]">
                            {dev.operatingSystem || 'Windows'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <StatusBadge status={dev.connectivityStatus} />
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-xs text-[var(--text-muted)]">
                          {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleTimeString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div 
              onClick={() => onNavigate('employees')}
              className="sentinel-card p-5.5 flex items-center gap-4 cursor-pointer hover:border-[var(--accent-primary)]/70 hover:shadow-md transition-all group"
            >
              <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent-primary)] group-hover:scale-105 transition-transform flex-shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  Register New Employee
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                  Add organizational personnel records to directory
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>

            <div 
              onClick={() => onNavigate('enrollment')}
              className="sentinel-card p-5.5 flex items-center gap-4 cursor-pointer hover:border-[var(--status-success)]/70 hover:shadow-md transition-all group"
            >
              <div className="p-3.5 rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success)] group-hover:scale-105 transition-transform flex-shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--status-success)] transition-colors">
                  Issue Enrollment Token
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                  Generate one-time 256-bit secure binding token
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Platform Health & Development Roadmap */}
        <div className="lg:col-span-5 space-y-6">
          {/* Backend Platform Health Card */}
          <BackendStatusCard />

          {/* Development Roadmap (Structured Stepper) */}
          <div className="sentinel-card p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)]">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Architecture Roadmap
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  System capability progression
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { phase: 'Phase 1', title: 'Architecture Foundation', status: 'Completed' },
                { phase: 'Phase 2', title: 'Enrollment & DPAPI Telemetry', status: 'Completed' },
                { phase: 'Phase 3', title: 'Sensor Telemetry (USB/Process/Net)', status: 'Upcoming', current: true },
                { phase: 'Phase 4', title: 'AI Behavioral Threat Engine', status: 'Planned' },
                { phase: 'Phase 5', title: 'Automated Incident Response', status: 'Planned' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-color)]/50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === 'Completed' ? 'bg-[var(--status-success)]' :
                      item.current ? 'bg-[var(--accent-primary)] animate-pulse' : 'bg-[var(--text-muted)]'
                    }`} />
                    <span className="font-semibold text-[var(--text-primary)]">{item.phase}:</span>
                    <span className="text-[var(--text-secondary)] truncate">{item.title}</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 ml-2 ${
                    item.status === 'Completed' ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]' :
                    item.current ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Enterprise Security Posture & Compliance Summary ── */}
      <div className="sentinel-card p-6 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Security Posture &amp; Hardware Integrity Status
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4.5 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-color)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>DPAPI Hardware Encapsulation</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every enrolled Windows agent encrypts session tokens and machine credentials at rest using native Windows DPAPI tied to the physical user profile.
            </p>
          </div>

          <div className="p-4.5 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-color)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Radio className="w-4 h-4 text-[var(--status-success)]" />
              <span>Sub-90s Telemetry Evaluation</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Real-time background agent transmits authenticated heartbeats every 30 seconds. Devices exceeding the 90s window automatically transition to OFFLINE.
            </p>
          </div>

          <div className="p-4.5 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-color)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
              <span>Zero-Trust Device Revocation</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Administrative revocation immediately invalidates device tokens in PostgreSQL, permanently severing connectivity and rejecting future heartbeats.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
