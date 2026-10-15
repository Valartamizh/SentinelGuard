import { 
  LayoutDashboard, 
  Laptop, 
  Users, 
  Building2,
  KeyRound, 
  ShieldAlert, 
  TrendingUp, 
  BrainCircuit, 
  FileText, 
  Settings,
  ChevronLeft, 
  ChevronRight, 
  X,
  LogOut,
  Activity
} from 'lucide-react';
import { authApi } from '../api/authApi';

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
      { id: 'devices', label: 'Endpoints', icon: Laptop, enabled: true },
      { id: 'employees', label: 'Employees', icon: Users, enabled: true },
      { id: 'departments', label: 'Departments', icon: Building2, enabled: true },
    ]
  },
  {
    title: 'SECURITY',
    items: [
      { id: 'activity', label: 'Endpoint Activity', icon: Activity, enabled: true, badge: 'Live' },
      { id: 'alerts', label: 'Alerts', icon: ShieldAlert, enabled: false, badge: 'Soon' },
      { id: 'risk', label: 'Risk Analysis', icon: TrendingUp, enabled: false, badge: 'Soon' },
      { id: 'ai', label: 'AI Analytics', icon: BrainCircuit, enabled: false, badge: 'Soon' },
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'enrollment', label: 'Device Enrollment', icon: KeyRound, enabled: true },
      { id: 'reports', label: 'Reports', icon: FileText, enabled: false, badge: 'Soon' },
      { id: 'settings', label: 'Settings', icon: Settings, enabled: false, badge: 'Soon' },
    ]
  }
];

export default function Sidebar({ 
  activeTab, 
  onSelectTab, 
  onLogout,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) {
  const username = authApi.getUsername();

  const handleSelect = (id, enabled) => {
    if (!enabled) return;
    onSelectTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <aside
      className={`
        flex flex-col h-full transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-64'}
        bg-[var(--bg-sidebar)]
        border-r border-[var(--border-color)]
        select-none z-40
      `}
    >
      {/* ── Brand Header (64px height to match Topbar) ── */}
      <div className="h-16 px-4.5 flex items-center justify-between border-b border-[var(--border-color)] flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Custom SentinelGuard Shield Mark */}
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path 
                d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" 
                fill="currentColor" 
                fillOpacity="0.95"
              />
              <path 
                d="M12 7v10M8 12h8" 
                stroke="#FFFFFF" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[var(--text-primary)] font-bold text-base leading-tight tracking-tight truncate">
                SentinelGuard
              </span>
              <span className="text-[var(--text-muted)] text-[11px] font-semibold tracking-wide uppercase truncate mt-0.5">
                Enterprise EDR
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Navigation Tree ── */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted)] tracking-wider">
                {section.title}
              </p>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleSelect(item.id, item.enabled)}
                    disabled={!item.enabled}
                    className={`
                      w-full h-11 flex items-center gap-3 px-3 rounded-lg text-sm font-medium
                      transition-colors cursor-pointer text-left
                      ${isActive
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold border-l-3 border-[var(--accent-primary)]'
                        : item.enabled
                        ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                        : 'text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : ''}`} />
                    
                    {!collapsed && (
                      <span className="flex-1 truncate">
                        {item.label}
                      </span>
                    )}

                    {!collapsed && item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium border border-[var(--border-color)]">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Tooltip on collapse */}
                  {collapsed && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-[var(--bg-card)] text-[var(--text-primary)] text-xs px-3 py-1.5 rounded-md shadow-lg border border-[var(--border-color)] whitespace-nowrap z-50 pointer-events-none">
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ({item.badge})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer Profile ── */}
      <div className="p-3 border-t border-[var(--border-color)] flex-shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg bg-[var(--bg-elevated)]/60`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {username ? username.charAt(0).toUpperCase() : 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                  {username || 'Administrator'}
                </span>
                <span className="text-[10px] text-[var(--status-success)] block font-medium">
                  ● Security Admin
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[var(--status-critical-bg)] transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
