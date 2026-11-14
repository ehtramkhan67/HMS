import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Standalone toast display component — the actual toast state lives in ToastContext.
 * This component is rendered inside the Layout to show toasts.
 */
export function ToastContainer() {
  // This is intentionally a thin wrapper; toasts render in ToastContext directly.
  return null;
}

/**
 * Inline alert component for form-level or section-level messages.
 */
export function Alert({ type = 'info', title, children, onClose }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />,
    error: <XCircle size={18} className="text-red-600 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
    info: <Info size={18} className="text-blue-600 shrink-0" />,
  };

  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      {icons[type]}
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm">{title}</p>}
        {children && <div className="text-sm mt-0.5 opacity-90">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
