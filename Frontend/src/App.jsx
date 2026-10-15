import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/common/Topbar';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DevicesPage from './pages/DevicesPage';
import EnrollmentPage from './pages/EnrollmentPage';
import EndpointActivityPage from './pages/EndpointActivityPage';
import LoginPage from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';
import { authApi } from './api/authApi';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isAuthenticated());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authApi.isAuthenticated());
    };
    window.addEventListener('sentinel_auth_change', handleAuthChange);
    return () => window.removeEventListener('sentinel_auth_change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onLogout={handleLogout}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />

          {/* Main Area: Topbar + Page Content */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <Topbar
              activeTab={activeTab}
              onLogout={handleLogout}
              onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
            />

            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {activeTab === 'dashboard' && (
                <DashboardPage onNavigate={setActiveTab} />
              )}
              {activeTab === 'activity' && (
                <EndpointActivityPage />
              )}
              {activeTab === 'devices' && (
                <DevicesPage />
              )}
              {activeTab === 'employees' && (
                <EmployeesPage onNavigateToEnrollment={() => setActiveTab('enrollment')} />
              )}
              {activeTab === 'departments' && (
                <DepartmentsPage />
              )}
              {activeTab === 'enrollment' && (
                <EnrollmentPage onNavigateToDevices={() => setActiveTab('devices')} />
              )}
            </main>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
