import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Plus, 
  Laptop, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { adminApi } from '../api/adminApi';

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [deptId, setDeptId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Success message
  const [successToast, setSuccessToast] = useState(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [empList, deptList] = await Promise.all([
        adminApi.getEmployees(),
        adminApi.getDepartments(),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
      if (deptList.length > 0) {
        setDeptId(prev => prev || deptList[0].id);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load employee data:', err);
      setError('Unable to load employee directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!empCode.trim() || !empName.trim() || !deptId) {
      setFormError('Please complete all required fields.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const created = await adminApi.createEmployee({
        employeeCode: empCode.trim(),
        fullName: empName.trim(),
        departmentId: deptId,
        status: 'ACTIVE'
      });
      setEmployees((prev) => [created, ...prev]);
      setEmpCode('');
      setEmpName('');
      setAddModalOpen(false);
      setSuccessToast(`Registered ${created.fullName} (${created.employeeCode})`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create employee');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.fullName?.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query);

      if (selectedDeptFilter === 'ALL') return matchesSearch;
      return matchesSearch && emp.departmentId === selectedDeptFilter;
    });
  }, [employees, searchQuery, selectedDeptFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Employee Directory
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
            Personnel records, organizational department assignment, and bound hardware endpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing}
            className="btn-secondary h-10 px-4 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="open-add-employee-modal-btn"
            onClick={() => setAddModalOpen(true)}
            className="btn-primary h-10 px-4 text-sm shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successToast && (
        <div className="p-3.5 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] text-xs flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="underline font-medium hover:opacity-80 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search code or employee name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="sentinel-input pl-9"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Department:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="sentinel-input py-1 px-2.5 text-xs w-auto cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Employee Table Card ── */}
      <div className="sentinel-card overflow-hidden">
        {loading && employees.length === 0 ? (
          <LoadingSkeleton rows={5} cols={5} />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title={employees.length === 0 ? 'No employees registered' : 'No matching employees'}
            description={
              employees.length === 0
                ? 'Register personnel to issue endpoint enrollment tokens.'
                : 'Try adjusting your search filter.'
            }
            action={
              employees.length === 0 && (
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="btn-primary text-sm px-4 py-2 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Employee
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/40 text-[var(--text-secondary)] text-[13px] font-semibold">
                  <th className="py-3.5 px-5">Employee Code</th>
                  <th className="py-3.5 px-5">Full Name</th>
                  <th className="py-3.5 px-5">Department</th>
                  <th className="py-3.5 px-5">Account Status</th>
                  <th className="py-3.5 px-5">Bound Endpoints</th>
                  <th className="py-3.5 px-5 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="h-[52px] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3.5 px-5 font-mono font-semibold text-[var(--accent-primary)]">
                      {emp.employeeCode}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[var(--text-primary)]">
                      {emp.fullName}
                    </td>
                    <td className="py-3.5 px-5 text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs border border-[var(--border-color)]">
                        <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{emp.departmentName || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                        <Laptop className="w-4 h-4 text-[var(--accent-primary)]" />
                        <span className="font-semibold text-[var(--text-primary)] text-sm">{emp.deviceCount || 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[12px] text-[var(--text-muted)]">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredEmployees.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/20">
            <span>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary p-1 disabled:opacity-40"
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
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ── */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => { setAddModalOpen(false); setFormError(null); }}
          title="Register New Employee"
          maxWidth="max-w-md"
        >
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Employee Identifier Code <span className="text-[var(--status-critical)]">*</span>
              </label>
              <input
                id="employee-code-input"
                type="text"
                placeholder="e.g. EMP001"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="sentinel-input font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Full Personnel Name <span className="text-[var(--status-critical)]">*</span>
              </label>
              <input
                id="employee-name-input"
                type="text"
                placeholder="e.g. John Sentinel"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="sentinel-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Organizational Department <span className="text-[var(--status-critical)]">*</span>
              </label>
              {departments.length === 0 ? (
                <p className="text-xs text-[var(--status-warning)] p-2 rounded bg-[var(--status-warning-bg)]">
                  Please create a department first from the Departments tab.
                </p>
              ) : (
                <select
                  id="employee-department-select"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="sentinel-input cursor-pointer"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => { setAddModalOpen(false); setFormError(null); }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                id="submit-employee-btn"
                type="submit"
                disabled={formSubmitting || departments.length === 0}
                className="btn-primary text-xs"
              >
                {formSubmitting ? 'Registering...' : 'Register Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
