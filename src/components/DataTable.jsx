import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';

/**
 * Reusable DataTable with search, sorting, and pagination.
 *
 * columns: [{ key, label, sortable?, render?, align?, className? }]
 */
export function DataTable({
  columns,
  data,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  totalCount,
  onPageChange,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No records found.',
}) {
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + data.length, totalCount);

  if (loading) {
    return (
      <div className="card">
        <div className="p-8 text-center text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {onSearch && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="input pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-primary-800 bg-primary-900">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold text-white uppercase tracking-wider text-xs ${
                      col.sortable !== false && onSort ? 'cursor-pointer select-none hover:text-secondary-300' : ''
                    } ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
                    onClick={() => col.sortable !== false && onSort && onSort(col.key)}
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable !== false && onSort && (
                        sortKey === col.key ? (
                          sortDir === 'asc' ? <ChevronUp size={14} className="text-secondary-400" /> : <ChevronDown size={14} className="text-secondary-400" />
                        ) : (
                          <ChevronsUpDown size={14} className="text-primary-300" />
                        )
                      )}
                    </span>
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
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-slate-700 ${
                          col.align === 'right' ? 'text-right' : ''
                        } ${col.className || ''}`}
                      >
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

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            Showing <span className="font-medium text-primary-900">{startIdx + 1}–{endIdx}</span> of{' '}
            <span className="font-medium text-primary-900">{totalCount}</span> records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-secondary-500 text-primary-900 font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-primary-50'
                  }`}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
