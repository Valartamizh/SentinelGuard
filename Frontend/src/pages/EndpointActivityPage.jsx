import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Terminal, 
  Usb, 
  ClipboardList, 
  Video, 
  Share2, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Laptop,
  Copy, 
  Check, 
  Eye,
  FileCode,
  Shield,
  Info
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { apiClient } from '../api/apiClient';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const CATEGORY_CONFIG = {
  PROCESS: { label: 'Process', icon: Terminal, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  USB: { label: 'USB Storage', icon: Usb, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  CLIPBOARD: { label: 'Clipboard', icon: ClipboardList, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  SCREEN_RECORDING: { label: 'Screen Recording', icon: Video, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  SCREEN_SHARING: { label: 'Screen Sharing', icon: Share2, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
};

const SEVERITY_CONFIG = {
  INFO: { label: 'INFO', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  LOW: { label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  MEDIUM: { label: 'MEDIUM', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  HIGH: { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  CRITICAL: { label: 'CRITICAL', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const PAGE_SIZE = 15;

export default function EndpointActivityPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    processEvents: 0,
    usbEvents: 0,
    clipboardEvents: 0,
    screenRecordingEvents: 0,
    screenSharingEvents: 0,
    recentEvents24h: 0
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Real-time SSE State
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef(null);

  // Event Detail Modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Fetch initial data & stats
  const fetchStats = async () => {
    try {
      const data = await adminApi.getEventStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load telemetry stats:', err);
    }
  };

  const fetchDeviceList = async () => {
    try {
      const list = await adminApi.getDevices();
      setDevices(list);
    } catch (err) {
      console.error('Failed to load devices for filter:', err);
    }
  };

  const fetchEvents = useCallback(async (page = 0) => {
    setRefreshing(true);
    try {
      const params = {
        page,
        size: PAGE_SIZE,
        sortBy: 'occurredAt',
        direction: 'desc'
      };
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (deviceFilter !== 'ALL') params.deviceId = deviceFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const pageData = await adminApi.getEvents(params);
      setEvents(pageData.content || []);
      setTotalPages(pageData.totalPages || 1);
      setTotalElements(pageData.totalElements || 0);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch endpoint events:', err);
      setError('Unable to load endpoint event log from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, severityFilter, deviceFilter, searchQuery]);

  useEffect(() => {
    fetchDeviceList();
    fetchStats();
    fetchEvents(0);
  }, [fetchEvents]);

  // Connect to live SSE stream
  useEffect(() => {
    const token = localStorage.getItem('sentinel_admin_token');
    if (!token) return;

    const streamUrl = `${apiClient.defaults.baseURL}/events/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
    };

    es.addEventListener('ENDPOINT_EVENT', (e) => {
      try {
        const newEvent = JSON.parse(e.data);
        // Prepend new live event
        setEvents((prev) => [newEvent, ...prev.slice(0, PAGE_SIZE - 1)]);
        setTotalElements((prev) => prev + 1);
        fetchStats();
      } catch (err) {
        console.error('Error handling SSE event:', err);
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Periodic fallback polling if SSE is disconnected
  useEffect(() => {
    if (!sseConnected) {
      const interval = setInterval(() => {
        fetchStats();
        fetchEvents(currentPage);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sseConnected, fetchEvents, currentPage]);

  const handleCopyJson = (details) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getEventSummary = (event) => {
    const details = event.details || {};
    switch (event.category) {
      case 'PROCESS':
        return `${details.processName || 'Process'} (PID: ${details.pid || '—'})`;
      case 'USB':
        return `Drive ${details.driveLetter || ''} ${details.deviceDisplayName || 'Removable Device'}`.trim();
      case 'CLIPBOARD':
        return `Clipboard Changed (${details.formatCategory || 'Metadata'}, Seq: ${details.sequenceNumber || '—'})`;
      case 'SCREEN_RECORDING':
      case 'SCREEN_SHARING':
        return `${details.applicationName || details.processName || 'Application'} (Active Capture Unconfirmed)`;
      default:
        return event.eventType;
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight flex items-center gap-3">
            Endpoint Activity Telemetry
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              sseConnected
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {sseConnected ? 'LIVE STREAM' : 'POLLING'}
            </span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time authenticated Windows endpoint security event stream &amp; audit pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchEvents(currentPage);
            }}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── 6 Category Summary Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Events */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Events</span>
            <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.totalEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-medium mt-1 block">
            {stats.recentEvents24h} in last 24h
          </span>
        </div>

        {/* Process Executions */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Processes</span>
            <Terminal className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.processEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-blue-500 font-medium mt-1 block">
            Lifecycle tracking
          </span>
        </div>

        {/* USB Activity */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">USB Storage</span>
            <Usb className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.usbEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-500 font-medium mt-1 block">
            Removable drives
          </span>
        </div>

        {/* Clipboard Changes */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-purple-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Clipboard</span>
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.clipboardEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-500 font-medium mt-1 block">
            Metadata only
          </span>
        </div>

        {/* Screen Recording Apps */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recording Apps</span>
            <Video className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.screenRecordingEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            OBS / Bandicam
          </span>
        </div>

        {/* Screen Sharing Apps */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center justify-between text-teal-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Sharing Apps</span>
            <Share2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.screenSharingEvents.toLocaleString()}
          </div>
          <span className="text-[11px] text-teal-500 font-medium mt-1 block">
            Teams / Zoom / Anydesk
          </span>
        </div>
      </div>

      {/* ── Filters & Controls ── */}
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by process name, details, device, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="PROCESS">Process Execution</option>
              <option value="USB">USB Storage</option>
              <option value="CLIPBOARD">Clipboard Metadata</option>
              <option value="SCREEN_RECORDING">Screen Recording</option>
              <option value="SCREEN_SHARING">Screen Sharing</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">All Endpoints</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceCode} ({d.hostname})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Event Stream Table ── */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-3 text-[var(--text-muted)]">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              No Telemetry Events Recorded
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-4">
              Start the SentinelGuard Windows Agent (<code className="font-mono bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[var(--accent-primary)]">python -m src.main start</code>) on an enrolled endpoint to observe real-time process, USB, clipboard, and application activity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/60 text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Occurred At</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">Personnel</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {events.map((ev) => {
                  const cat = CATEGORY_CONFIG[ev.category] || { label: ev.category, icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
                  const sev = SEVERITY_CONFIG[ev.severity] || { label: ev.severity, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
                  const CatIcon = cat.icon;

                  return (
                    <tr
                      key={ev.eventUuid || ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-[var(--bg-elevated)]/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {ev.occurredAt ? new Date(ev.occurredAt).toLocaleTimeString() : '—'}
                        <span className="text-[10px] text-[var(--text-muted)] block font-sans">
                          {ev.occurredAt ? new Date(ev.occurredAt).toLocaleDateString() : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${cat.bg} ${cat.color} ${cat.border}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          {cat.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {ev.eventType}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {ev.hostname || '—'}
                        </div>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {ev.deviceCode || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[var(--text-primary)] font-medium">
                          {ev.employeeName || '—'}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {ev.departmentName || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs truncate font-mono text-[11px]">
                        {getEventSummary(ev)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sev.bg} ${sev.color} ${sev.border}`}>
                          {sev.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {totalElements > 0 && (
          <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/30">
            <span>
              Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements} telemetry events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchEvents(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="btn-secondary p-1 disabled:opacity-40 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-[var(--text-primary)]">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => fetchEvents(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="btn-secondary p-1 disabled:opacity-40 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Event Details Modal ── */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Event Inspection: ${selectedEvent.eventType}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header info badge card */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedEvent.hostname} ({selectedEvent.deviceCode})
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Event UUID: {selectedEvent.eventUuid || selectedEvent.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                  SEVERITY_CONFIG[selectedEvent.severity]?.bg || 'bg-gray-500/10'
                } ${SEVERITY_CONFIG[selectedEvent.severity]?.color || 'text-gray-500'} ${
                  SEVERITY_CONFIG[selectedEvent.severity]?.border || 'border-gray-500/20'
                }`}>
                  {selectedEvent.severity}
                </span>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                  CATEGORY_CONFIG[selectedEvent.category]?.bg || 'bg-gray-500/10'
                } ${CATEGORY_CONFIG[selectedEvent.category]?.color || 'text-gray-500'} ${
                  CATEGORY_CONFIG[selectedEvent.category]?.border || 'border-gray-500/20'
                }`}>
                  {selectedEvent.category}
                </span>
              </div>
            </div>

            {/* Personnel & Endpoint Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Personnel</span>
                <span className="font-semibold text-[var(--text-primary)] mt-0.5 block truncate">
                  {selectedEvent.employeeName || '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Department</span>
                <span className="font-semibold text-[var(--text-primary)] mt-0.5 block truncate">
                  {selectedEvent.departmentName || '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Occurred At (UTC)</span>
                <span className="font-mono text-[var(--text-primary)] mt-0.5 block">
                  {selectedEvent.occurredAt ? new Date(selectedEvent.occurredAt).toUTCString() : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Received By Server</span>
                <span className="font-mono text-[var(--text-primary)] mt-0.5 block">
                  {selectedEvent.receivedAt ? new Date(selectedEvent.receivedAt).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>

            {/* Sanitized Structured Details */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                <h5 className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-xs">
                  Event Category Telemetry Details
                </h5>
              </div>

              {selectedEvent.category === 'PROCESS' && (
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block font-sans">Process Name:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedEvent.details?.processName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-sans">Process ID (PID):</span>
                    <span className="text-[var(--text-primary)]">{selectedEvent.details?.pid}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-sans">Parent PID:</span>
                    <span className="text-[var(--text-primary)]">{selectedEvent.details?.ppid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-sans">Executable Path:</span>
                    <span className="text-[var(--text-primary)] truncate block" title={selectedEvent.details?.executablePath}>
                      {selectedEvent.details?.executablePath || 'Inaccessible / System'}
                    </span>
                  </div>
                </div>
              )}

              {selectedEvent.category === 'USB' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block">Drive Letter:</span>
                    <span className="font-mono font-bold text-amber-500">{selectedEvent.details?.driveLetter || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Display Name:</span>
                    <span className="text-[var(--text-primary)]">{selectedEvent.details?.deviceDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Mount Point:</span>
                    <span className="font-mono text-[var(--text-primary)]">{selectedEvent.details?.mountPoint || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Filesystem:</span>
                    <span className="font-mono text-[var(--text-primary)]">{selectedEvent.details?.filesystem || 'N/A'}</span>
                  </div>
                </div>
              )}

              {selectedEvent.category === 'CLIPBOARD' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block">Format Category:</span>
                      <span className="font-bold text-purple-500">{selectedEvent.details?.formatCategory || 'TEXT'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block">Sequence Number:</span>
                      <span className="font-mono text-[var(--text-primary)]">{selectedEvent.details?.sequenceNumber}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <Info className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>Privacy enforced: No copied text, tokens, passwords, images, or content hashes were collected or retained.</span>
                  </div>
                </div>
              )}

              {(selectedEvent.category === 'SCREEN_RECORDING' || selectedEvent.category === 'SCREEN_SHARING') && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block">Detected Application:</span>
                      <span className="font-bold text-[var(--text-primary)]">{selectedEvent.details?.applicationName || selectedEvent.details?.processName}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block">Process (PID):</span>
                      <span className="font-mono text-[var(--text-primary)]">{selectedEvent.details?.processName} ({selectedEvent.details?.pid})</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block">Active Capture Confirmed:</span>
                      <span className="font-bold text-amber-500">
                        {selectedEvent.details?.activeCaptureConfirmed ? 'CONFIRMED' : 'UNCONFIRMED (Process presence only)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block">Detection Status:</span>
                      <span className="text-[var(--text-secondary)]">{selectedEvent.details?.note || 'Known catalog application'}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>Zero audio/video capture: SentinelGuard does not capture screenshots, meeting audio, video frames, or participant streams.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Raw JSON Payload Inspector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  Structured JSON Payload
                </span>
                <button
                  onClick={() => handleCopyJson(selectedEvent)}
                  className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
