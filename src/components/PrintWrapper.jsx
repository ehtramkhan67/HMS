/**
 * Print-friendly wrapper for prescriptions, rest slips, and certificates.
 * The `.print-area` content is shown when printing; screen-only chrome is hidden.
 */
export function PrintWrapper({ children, onPrint, title = 'Print', actions }) {
  return (
    <div className="space-y-4">
      {/* Screen-only action bar */}
      <div className="flex items-center justify-between gap-3 no-print">
        <div />
        <div className="flex items-center gap-2">
          {actions}
          <button onClick={onPrint || (() => window.print())} className="btn-primary btn-sm">
            Print
          </button>
        </div>
      </div>

      {/* Printable document */}
      <div className="print-area bg-white border border-slate-200 rounded-xl p-8 mx-auto max-w-2xl">
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-xl font-bold text-slate-900">CADET COLLEGE KOHAT</h1>
          <p className="text-sm text-slate-600 mt-1">{title}</p>
        </div>
        {children}
        <div className="mt-10 pt-4 border-t border-slate-300 text-xs text-slate-500 text-center">
          Cadet College Kohat Management System — This is a system-generated document.
        </div>
      </div>
    </div>
  );
}

export function SignatureLine({ name, role, date }) {
  return (
    <div className="flex justify-between items-end mt-12 gap-8">
      <div className="text-center">
        <div className="w-40 border-b border-slate-400 mb-1" />
        <p className="text-sm font-medium text-slate-700">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
      <div className="text-center">
        <div className="w-40 border-b border-slate-400 mb-1" />
        <p className="text-xs text-slate-500">Date: {date}</p>
      </div>
    </div>
  );
}
