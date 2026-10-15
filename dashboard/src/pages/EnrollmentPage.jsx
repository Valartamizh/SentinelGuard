import { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  User, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { adminApi } from '../api/adminApi';

export default function EnrollmentPage({ onNavigateToDevices }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Generated token state (held ONLY in memory during this session!)
  const [tokenResult, setTokenResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);

  // Verification poll: watches if a device registers for this employee
  const [registeredDevice, setRegisteredDevice] = useState(null);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const list = await adminApi.getEmployees();
        const activeList = list.filter((e) => e.status === 'ACTIVE');
        setEmployees(activeList);
        if (activeList.length > 0) {
          setSelectedEmpId(activeList[0].id);
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
        setError('Unable to load employee directory for enrollment.');
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!tokenResult?.expiresAt) return;
    const expiresMs = new Date(tokenResult.expiresAt).getTime();

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setTimeLeftSeconds(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenResult]);

  // Polling for registration confirmation once token is generated
  useEffect(() => {
    if (!tokenResult?.employeeId) return;

    const checkDevice = async () => {
      try {
        const devices = await adminApi.getDevices();
        const found = devices.find((d) => d.employeeId === tokenResult.employeeId && d.registeredAt && new Date(d.registeredAt) >= new Date(tokenResult.createdAt));
        if (found) {
          setRegisteredDevice(found);
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    const interval = setInterval(checkDevice, 4000);
    return () => clearInterval(interval);
  }, [tokenResult]);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    setGenerating(true);
    setError(null);
    setCopied(false);
    setRegisteredDevice(null);
    try {
      const res = await adminApi.createEnrollmentToken(selectedEmpId);
      setTokenResult(res);
    } catch (err) {
      console.error('Failed to generate token:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to issue enrollment token');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!tokenResult?.enrollmentToken) return;
    navigator.clipboard.writeText(tokenResult.enrollmentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmpId);

  // Determine current active step
  const currentStep = registeredDevice ? 5 : tokenResult ? 3 : 1;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Device Enrollment
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
          Cryptographically bind Windows agent laptops to verified employee records via DPAPI.
        </p>
      </div>

      {/* ── 5-Step Process Indicator ── */}
      <div className="sentinel-card p-5 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] text-sm">
          {[
            { step: 1, label: 'Select Employee' },
            { step: 2, label: 'Issue 256-bit Token' },
            { step: 3, label: 'Display One-Time Secret' },
            { step: 4, label: 'Run Agent on Laptop' },
            { step: 5, label: 'Verify Binding' },
          ].map((item, idx) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div key={item.step} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  isCompleted 
                    ? 'bg-[var(--status-success)] text-white' 
                    : isCurrent 
                    ? 'bg-[var(--accent-primary)] text-white' 
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-color)]'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <span className={`font-medium ${isCurrent ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                  {item.label}
                </span>
                {idx < 4 && (
                  <div className="w-8 h-[1px] bg-[var(--border-color)] mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Step 1 & 2: Employee Selection Form ── */}
      <div className="sentinel-card p-6 space-y-4 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[19px] font-semibold text-[var(--text-primary)]">
              Step 1: Select Organization Personnel
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              Choose an active employee to associate with the incoming Windows endpoint.
            </p>
          </div>
        </div>

        {loadingEmployees ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
            <span>Loading personnel directory...</span>
          </div>
        ) : employees.length === 0 ? (
          <p className="text-xs text-[var(--status-warning)] p-3 rounded-lg bg-[var(--status-warning-bg)]">
            No active employees available. Please create an employee first in the Employees page.
          </p>
        ) : (
          <form onSubmit={handleGenerateToken} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Select Employee
                </label>
                <select
                  id="enrollment-employee-select"
                  value={selectedEmpId}
                  onChange={(e) => {
                    setSelectedEmpId(e.target.value);
                    setTokenResult(null);
                    setRegisteredDevice(null);
                  }}
                  className="sentinel-input cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} · {emp.fullName} ({emp.departmentName || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  id="generate-token-btn"
                  type="submit"
                  disabled={generating || !selectedEmpId}
                  className="btn-primary w-full h-11 text-sm shadow-xs"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Generate Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {selectedEmployeeObj && (
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span>Code: <strong className="text-[var(--text-primary)] font-mono">{selectedEmployeeObj.employeeCode}</strong></span>
                <span>·</span>
                <span>Dept: <strong className="text-[var(--text-primary)]">{selectedEmployeeObj.departmentName}</strong></span>
                <span>·</span>
                <span>Currently Bound Devices: <strong className="text-[var(--text-primary)]">{selectedEmployeeObj.deviceCount || 0}</strong></span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── Step 3 & 4: Token Display & Execution Instructions ── */}
      {tokenResult && (
        <div className="sentinel-card p-6 space-y-5 border-2 border-[var(--accent-primary)]/40 max-w-3xl animate-fade-in-up">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--status-success)] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>One-Time Enrollment Token Generated</span>
            </div>

            {timeLeftSeconds !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning)] text-xs font-mono font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expires: {Math.floor(timeLeftSeconds / 60)}:
                  {(timeLeftSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-xs text-[var(--status-warning)]">
            <strong>Security Warning:</strong> This token carries 256 bits of entropy and is shown <strong>strictly once</strong>. It is not saved in browser storage or URLs. Copy it now.
          </div>

          {/* Token Box */}
          <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2">
            <span className="text-[11px] font-mono text-[var(--text-muted)] block">
              Plaintext One-Time Secret (SHA-256 hashed on server):
            </span>
            <div className="flex items-center gap-2">
              <input
                id="enrollment-token-input"
                type="text"
                readOnly
                value={tokenResult.enrollmentToken}
                className="flex-1 bg-transparent text-[var(--accent-primary)] font-mono text-sm tracking-wide select-all focus:outline-none"
              />
              <button
                id="copy-token-btn"
                onClick={handleCopy}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Token'}</span>
              </button>
            </div>
          </div>

          {/* Step 4: Windows Agent Command Instructions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--accent-primary)]" />
              <h3 className="text-xs font-bold text-[var(--text-primary)]">
                Step 4: Execute on Monitored Windows Laptop (PowerShell)
              </h3>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              1. Run enrollment with the generated token:
            </p>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] font-mono text-xs text-[var(--text-primary)] border border-[var(--border-color)] select-all overflow-x-auto">
              cd agent ; python -m src.main enroll --token {tokenResult.enrollmentToken}
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              2. Start continuous 30-second heartbeat monitoring:
            </p>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] font-mono text-xs text-[var(--text-primary)] border border-[var(--border-color)] select-all overflow-x-auto">
              python -m src.main start
            </div>
          </div>

          {/* Step 5: Verification indicator */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            {registeredDevice ? (
              <div className="p-4 rounded-xl bg-[var(--status-success-bg)] border border-[var(--status-success-border)] flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--status-success)] flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--status-success)]">
                      Endpoint Enrolled &amp; Verified!
                    </h4>
                    <p className="text-[11px] text-[var(--text-primary)] mt-0.5">
                      Device Code: <strong className="font-mono">{registeredDevice.deviceCode}</strong> · Hostname: <strong>{registeredDevice.hostname}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToDevices && onNavigateToDevices('devices')}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  View in Endpoints
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                <span>Listening for agent check-in from Windows client...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
