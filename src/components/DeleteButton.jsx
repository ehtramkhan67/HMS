import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * Two-step permanent-delete button.
 *
 * First click arms it ("Delete?" for 3 seconds), second click performs
 * the delete — so a stray click never destroys a record. The record is
 * removed for good (localStorage + database, all devices).
 */
export default function DeleteButton({ onConfirm, label = 'Delete permanently', disabled = false, className = '' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  if (armed) {
    return (
      <button
        type="button"
        onClick={() => { setArmed(false); onConfirm(); }}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition ${className}`}
      >
        <Trash2 size={12} /> Delete?
      </button>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={() => setArmed(true)}
      className={`inline-flex items-center p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <Trash2 size={15} />
    </button>
  );
}
