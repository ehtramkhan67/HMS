import { Inbox } from 'lucide-react';

/**
 * Alternative compact DataTable used for simpler tables.
 */
export function SimpleTable({ columns, data, loading, emptyMessage = 'No records found.' }) {
  if (loading) {
    return (
      <div className="card">
        <div className="p-8 text-center text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-primary-800 bg-primary-900">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-semibold text-white uppercase tracking-wider text-xs ${col.align === 'right' ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                  <Inbox size={24} className="mx-auto mb-2 text-primary-300" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id || idx} className="border-b border-primary-50 last:border-b-0 hover:bg-primary-50/60 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
