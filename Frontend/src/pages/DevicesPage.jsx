import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Laptop, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Terminal,
  Usb,
  ClipboardList,
  Video
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { adminApi } from '../api/adminApi';

const PAGE_SIZE = 10;

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Details Modal
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Revoke Dialog
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchDevices = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await adminApi.getDevices();
      setDevices(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Unable to load device inventory from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        d.deviceCode?.toLowerCase().includes(query) ||
        d.hostname?.toLowerCase().includes(query) ||
        d.employeeName?.toLowerCase().includes(query) ||
        d.departmentName?.toLowerCase().includes(query);

      if (statusFilter === 'ALL') return matchesSearch;
      return matchesSearch && d.connectivityStatus === statusFilter;
    });
  }, [devices, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDevices.slice(start, start + PAGE_SIZE);
  }, [filteredDevices, currentPage]);

  const handleInspect = async (id) => {
    try {
      const detail = await adminApi.getDeviceById(id);
      setSelectedDevice(detail);
    } catch (err) {
      console.error('Failed to load device details:', err);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await adminApi.revokeDevice(revokeTarget.id);
      setFeedbackMessage({ type: 'success', text: `Device ${revokeTarget.deviceCode} (${revokeTarget.hostname}) has been revoked.` });
      setRevokeTarget(null);
      // Refresh details and list
      if (selectedDevice?.id === revokeTarget.id) {
        const updated = await adminApi.getDeviceById(revokeTarget.id);
        setSelectedDevice(updated);
      }
      fetchDevices();
    } catch (err) {
      console.error('Failed to revoke device:', err);
      setFeedbackMessage({ type: 'error', text: 'Failed to revoke device.' });
    } finally {
      setRevoking(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Endpoint Inventory
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
            Registered Windows client endpoints, live connection telemetry, and cryptographic bindings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); fetchDevices(); }}
            disabled={refreshing}
            className="btn-secondary h-10 px-4 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 animate-fade-in-up border ${
          feedbackMessage.type === 'success'
            ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
            : 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]'
        }`}>
          {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDevices} className="underline font-medium hover:opacity-80 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search code, hostname, employee..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="sentinel-input pl-9"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
          {['ALL', 'ONLINE', 'OFFLINE', 'REVOKED'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="sentinel-card overflow-hidden">
        {loading && devices.length === 0 ? (
          <LoadingSkeleton rows={5} cols={5} />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            icon={Laptop}
            title={devices.length === 0 ? 'No endpoints enrolled' : 'No matching endpoints'}
            description={
              devices.length === 0
                ? 'Generate an enrollment token to connect your first Windows client.'
                : 'Try clearing your search query or changing status filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/40 text-[var(--text-secondary)] text-[13px] font-semibold">
                  <th className="py-3.5 px-5">Device Code</th>
                  <th className="py-3.5 px-5">Hostname</th>
                  <th className="py-3.5 px-5">Assigned Personnel</th>
                  <th className="py-3.5 px-5">Operating System</th>
                  <th className="py-3.5 px-5">Agent Ver.</th>
                  <th className="py-3.5 px-5">Connection Status</th>
                  <th className="py-3.5 px-5">Last Seen</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedDevices.map((dev) => (
                  <tr 
                    key={dev.id}
                    className="h-[52px] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                    onClick={() => handleInspect(dev.id)}
                  >
                    <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent-primary)]">
                      {dev.deviceCode}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[var(--text-primary)]">
                      {dev.hostname}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="text-[var(--text-primary)] font-medium">{dev.employeeName}</div>
                      <div className="text-[12px] text-[var(--text-muted)] font-mono mt-0.5">{dev.employeeCode} · {dev.departmentName}</div>
                    </td>
                    <td className="py-3.5 px-5 text-[var(--text-secondary)]">
                      {dev.operatingSystem || 'Windows'}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[var(--text-secondary)] text-[13px]">
                      v{dev.agentVersion || '1.0.0'}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={dev.connectivityStatus} />
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[12px] text-[var(--text-muted)]">
                      {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(dev.id);
                        }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredDevices.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/20">
            <span>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredDevices.length)} of {filteredDevices.length} endpoints
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary p-1 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-[var(--text-primary)]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary p-1 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Device Details Modal ── */}
      {selectedDevice && (
        <Modal
          isOpen={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          title={`Endpoint Details: ${selectedDevice.deviceCode}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Header Identity Row */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedDevice.hostname}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    UUID: {selectedDevice.id}
                  </p>
                </div>
              </div>

              <StatusBadge status={selectedDevice.connectivityStatus} />
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Agent Version</span>
                <span className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                  v{selectedDevice.agentVersion || '1.0.0'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Registration</span>
                <span className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {selectedDevice.registeredAt ? new Date(selectedDevice.registeredAt).toLocaleDateString() : '—'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Last Heartbeat</span>
                <span className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {selectedDevice.lastSeenAt ? new Date(selectedDevice.lastSeenAt).toLocaleTimeString() : 'Never'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Lifecycle Status</span>
                <span className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {selectedDevice.lifecycleStatus}
                </span>
              </div>
            </div>

            {/* Personnel Association */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
              <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Bound Personnel &amp; Department
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block">Full Name:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedDevice.employeeName}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Employee Code:</span>
                  <span className="font-mono text-[var(--text-primary)]">{selectedDevice.employeeCode}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Department:</span>
                  <span className="text-[var(--text-primary)]">{selectedDevice.departmentName}</span>
                </div>
              </div>
            </div>

            {/* Agent Telemetry & Real-Time Monitoring Subsystems */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Agent Telemetry &amp; Monitoring Subsystems
                  </h5>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  selectedDevice.monitoringStatus === 'MONITORING_ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : selectedDevice.monitoringStatus === 'MONITORING_DEGRADED'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                  ● {selectedDevice.monitoringStatus || 'MONITORING_ACTIVE'}
                </span>
              </div>

              {/* Collector Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">Process</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {selectedDevice.processMonitorStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Usb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">USB</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {selectedDevice.usbMonitorStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">Clipboard</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {selectedDevice.clipboardMonitorStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">Screen Apps</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {selectedDevice.screenMonitorStatus || 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Queue & Ingestion Telemetry */}
              <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between text-[11px] text-[var(--text-muted)] gap-2">
                <span>
                  Buffered Queue: <strong className="text-[var(--text-primary)] font-mono">{selectedDevice.queuePendingCount ?? 0}</strong> events pending
                </span>
                <span>
                  Last Event Ingestion: <strong className="text-[var(--text-primary)] font-mono">
                    {selectedDevice.lastEventUploadAt ? new Date(selectedDevice.lastEventUploadAt).toLocaleTimeString() : 'Awaiting first event'}
                  </strong>
                </span>
              </div>

              {selectedDevice.monitoringErrors && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                  <strong>Warning:</strong> {selectedDevice.monitoringErrors}
                </div>
              )}
            </div>

            {/* Heartbeat History Table (last 20) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Recent Heartbeat Audit Telemetry (Last 20)
                </h5>
              </div>

              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {selectedDevice.recentHeartbeats && selectedDevice.recentHeartbeats.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Received Time</th>
                        <th className="py-2 px-3">Agent Version</th>
                        <th className="py-2 px-3 text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] font-mono text-[11px]">
                      {selectedDevice.recentHeartbeats.map((hb) => (
                        <tr key={hb.id} className="hover:bg-[var(--bg-hover)]">
                          <td className="py-2 px-3 text-[var(--text-primary)]">
                            {new Date(hb.receivedAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">
                            v{hb.agentVersion || '1.0.0'}
                          </td>
                          <td className="py-2 px-3 text-right text-[var(--status-success)] font-semibold">
                            {hb.status || 'RUNNING'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    No heartbeat telemetry recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Revoke Action Area */}
            {selectedDevice.lifecycleStatus !== 'REVOKED' ? (
              <div className="p-4 rounded-xl bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] flex items-center justify-between">
                <div>
                  <h6 className="text-xs font-bold text-[var(--status-critical)] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Security Revocation
                  </h6>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Revoking this endpoint invalidates credentials immediately and rejects future heartbeats.
                  </p>
                </div>

                <button
                  onClick={() => setRevokeTarget(selectedDevice)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--status-critical)] text-white font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap ml-4"
                >
                  Revoke Device
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-xs text-[var(--status-critical)] font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                This endpoint has been permanently revoked by an administrator.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Confirm Revoke Dialog ── */}
      {revokeTarget && (
        <ConfirmDialog
          isOpen={!!revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onConfirm={handleConfirmRevoke}
          title={`Revoke Device: ${revokeTarget.deviceCode}?`}
          message={`Are you sure you want to revoke endpoint "${revokeTarget.hostname}" (${revokeTarget.deviceCode})? Its credentials will be permanently invalidated and the agent will be rejected on subsequent heartbeat transmissions.`}
          confirmText="Yes, Revoke Endpoint"
          isDestructive={true}
          loading={revoking}
        />
      )}
    </div>
  );
}
