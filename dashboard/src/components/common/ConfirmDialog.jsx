import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isDestructive && (
            <div className="p-2 rounded-lg bg-[var(--status-critical-bg)] text-[var(--status-critical)] flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary text-xs px-3.5 py-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer text-white ${
              isDestructive
                ? 'bg-[var(--status-critical)] hover:opacity-90'
                : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
