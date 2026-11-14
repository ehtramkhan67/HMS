import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog with overlay, escape-to-close, and focus trap basics.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus the modal on open
      setTimeout(() => ref.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeClass} max-h-[90vh] flex flex-col animate-scale-in outline-none`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100 shrink-0">
          <h2 className="font-bold text-primary-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors focus-visible:ring-2 focus-visible:ring-secondary-500"
            aria-label="Close dialog"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-primary-100 bg-primary-50/40 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
