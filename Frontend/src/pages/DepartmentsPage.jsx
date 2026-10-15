import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Users
} from 'lucide-react';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { adminApi } from '../api/adminApi';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Add Department Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [deptList, empList] = await Promise.all([
        adminApi.getDepartments(),
        adminApi.getEmployees(),
      ]);
      setDepartments(deptList);
      setEmployees(empList);
      setError(null);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Unable to load department directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await adminApi.createDepartment(deptName.trim());
      setDepartments((prev) => [...prev, created]);
      setDeptName('');
      setAddModalOpen(false);
      setToast(`Department "${created.name}" created successfully.`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute employee count per department
  const employeeCountByDept = (deptId) => {
    return employees.filter((e) => e.departmentId === deptId).length;
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-7 bg-[var(--bg-main)] transition-colors">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Departments
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
            Organizational divisions and workforce unit grouping.
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
            id="open-add-department-modal-btn"
            onClick={() => setAddModalOpen(true)}
            className="btn-primary h-10 px-4 text-sm shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {toast && (
        <div className="p-3.5 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] text-sm flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="underline font-medium hover:opacity-80 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ── Departments Grid ── */}
      {loading && departments.length === 0 ? (
        <LoadingSkeleton rows={3} cols={3} />
      ) : departments.length === 0 ? (
        <div className="sentinel-card">
          <EmptyState
            icon={Building2}
            title="No departments created"
            description="Create your first organization department to organize endpoints and personnel."
            action={
              <button
                onClick={() => setAddModalOpen(true)}
                className="btn-primary text-sm px-4 py-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Create Department
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const count = employeeCountByDept(dept.id);
            return (
              <div 
                key={dept.id}
                className="sentinel-card p-6 flex flex-col justify-between space-y-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {dept.name}
                      </h3>
                      <p className="text-[12px] text-[var(--text-muted)] font-mono mt-0.5">
                        UUID: {dept.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>Personnel:</span>
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {count} member{count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Department Modal ── */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => { setAddModalOpen(false); setFormError(null); }}
          title="Create Organizational Department"
          maxWidth="max-w-md"
        >
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateDepartment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Department Name <span className="text-[var(--status-critical)]">*</span>
              </label>
              <input
                id="new-department-name-input"
                type="text"
                placeholder="e.g. Threat Intelligence Operations"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="sentinel-input"
                required
                autoFocus
              />
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
                id="submit-department-btn"
                type="submit"
                disabled={submitting || !deptName.trim()}
                className="btn-primary text-xs"
              >
                {submitting ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
