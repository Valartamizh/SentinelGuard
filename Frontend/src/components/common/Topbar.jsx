import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  LogOut, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { authApi } from '../../api/authApi';
import { fetchHealth } from '../../api/healthApi';

const PAGE_NAMES = {
  dashboard: { section: 'Overview', title: 'Security Overview' },
  devices: { section: 'Overview', title: 'Endpoints' },
  employees: { section: 'Overview', title: 'Employees' },
  departments: { section: 'Overview', title: 'Departments' },
  enrollment: { section: 'Management', title: 'Device Enrollment' },
  activity: { section: 'Security', title: 'Endpoint Activity Telemetry' },
  alerts: { section: 'Security', title: 'Alerts' },
  risk: { section: 'Security', title: 'Risk Analysis' },
  ai: { section: 'Security', title: 'AI Analytics' },
  reports: { section: 'Management', title: 'Reports' },
  settings: { section: 'Management', title: 'Settings' },
};

export default function Topbar({ activeTab, onLogout, onToggleMobileSidebar }) {
  const username = authApi.getUsername();
  const [profileOpen, setProfileOpen] = useState(false);
  const [backendUp, setBackendUp] = useState(true);
  const profileRef = useRef(null);

  const pageInfo = PAGE_NAMES[activeTab] || { section: 'Overview', title: 'Console' };

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll backend health indicator every 30s
  useEffect(() => {
    const check = async () => {
      try {
        await fetchHealth();
        setBackendUp(true);
      } catch {
        setBackendUp(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 sm:px-8 flex items-center justify-between transition-colors flex-shrink-0">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)] font-medium">
            {pageInfo.section}
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--border-strong)]" />
          <span className="text-[var(--text-primary)] font-semibold">
            {pageInfo.title}
          </span>
        </nav>
      </div>

      {/* Right: Health pill + Theme Toggle + Admin Profile */}
      <div className="flex items-center gap-2.5">
        {/* Backend health status badge */}
        <div 
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            backendUp 
              ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
              : 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]'
          }`}
          title={backendUp ? 'Backend connection healthy (Spring Boot)' : 'Backend unreachable'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${backendUp ? 'bg-[var(--status-success)] animate-pulse-subtle' : 'bg-[var(--status-critical)]'}`} />
          <span>{backendUp ? 'API Connected' : 'API Offline'}</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile menu */}
        <div className="relative" ref={profileRef}>
          <button
            id="admin-profile-menu-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
            aria-label="Administrator profile"
          >
            <div className="w-7 h-7 rounded-md bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)] flex items-center justify-center font-bold text-xs">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline-block text-xs font-medium text-[var(--text-primary)] max-w-[120px] truncate">
              {username}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl py-1 z-50 animate-fade-in-up">
              <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/30">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{username}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">ROLE_ADMIN</p>
              </div>

              <a
                href="/swagger-ui/index.html"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Swagger API Docs
                </span>
              </a>

              <button
                id="topbar-logout-btn"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--status-critical)] hover:bg-[var(--status-critical-bg)] transition-colors cursor-pointer text-left border-t border-[var(--border-color)]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
