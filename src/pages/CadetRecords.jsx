import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader, Avatar } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, SearchEmpty, EmptyState } from '../components/States';
import { useTable } from '../hooks/useTable';
import { api } from '../utils/api';
import { houses, classes } from '../data/cadets';
import { isLimitedRole } from '../utils/rbac';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSyncRefresh } from '../utils/sync';
import DeleteButton from '../components/DeleteButton';

export default function CadetRecords() {
  const { role, user } = useAuth();
  const toast = useToast();
  // House Masters only ever see cadets of their own house.
  const hmHouseId = role === 'houseMaster' ? (user?.houseId || '') : '';
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [houseFilter, setHouseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const limited = isLimitedRole(role);

  const loadCadets = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.getCadets({ house: hmHouseId || houseFilter || undefined, className: classFilter || undefined });
      setCadets(data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadCadets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseFilter, classFilter]);
  // Live sync: re-render with fresh data when another device changes it.
  useSyncRefresh(loadCadets);

  const handleDeleteCadet = async (row) => {
    try {
      await api.deleteCadet(row.id);
      setCadets(prev => prev.filter(c => c.id !== row.id));
      toast.success(`${row.name} deleted permanently`);
    } catch {
      toast.error('Failed to delete cadet record');
    }
  };

  const table = useTable(cadets, {
    searchKeys: ['name', 'kitNumber', 'houseName', 'className'],
    pageSize: 10,
    defaultSort: 'name',
  });

  const columns = useMemo(() => {
    const base = [
      {
        key: 'name',
        label: 'Cadet',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div>
              <p className="font-medium text-slate-800">{row.name}</p>
              <p className="text-xs text-slate-500">{row.kitNumber}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'houseName',
        label: 'House',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.houseColor }} />
            {row.houseName}
          </span>
        ),
      },
      { key: 'className', label: 'Class' },
      { key: 'age', label: 'Age' },
      { key: 'bloodGroup', label: 'Blood' },
    ];

    if (!limited) {
      base.push({ key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> });
    }

    base.push({
      key: 'actions',
      label: '',
      sortable: false,
      align: 'right',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <Link
            to={`/cadets/${row.id}`}
            className="btn-secondary btn-sm inline-flex"
            aria-label={`View profile of ${row.name}`}
          >
            <Eye size={14} /> View
          </Link>
          {role === 'admin' && (
            <DeleteButton onConfirm={() => handleDeleteCadet(row)} label={`Delete ${row.name} permanently`} />
          )}
        </span>
      ),
    });

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limited, role]);

  return (
    <div>
      <PageHeader
        title="Cadet Records"
        subtitle={`${cadets.length} cadets registered${hmHouseId && user?.houseName ? ` — ${user.houseName}` : ''}`}
        actions={null}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            placeholder="Search by name, kit number…"
            className="input pl-9"
            aria-label="Search cadets"
          />
          <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <select
          value={hmHouseId || houseFilter}
          onChange={(e) => setHouseFilter(e.target.value)}
          disabled={!!hmHouseId}
          className="input w-full sm:w-48 disabled:opacity-60"
          aria-label="Filter by house"
        >
          <option value="">All Houses</option>
          {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="input w-full sm:w-56"
          aria-label="Filter by class"
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading && <Loading message="Loading cadet records…" />}
      {error && <ErrorState message={error} onRetry={loadCadets} />}

      {!loading && !error && table.totalCount === 0 && (
        table.search
          ? <SearchEmpty query={table.search} />
          : <EmptyState
              title="No cadet records yet"
              message="Cadets are added automatically when saved through Consultation or admitted in Ward & Beds."
            />
      )}

      {!loading && !error && table.totalCount > 0 && (
        <>
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
                          col.sortable !== false ? 'cursor-pointer select-none hover:text-secondary-300' : ''
                        } ${col.align === 'right' ? 'text-right' : ''}`}
                        onClick={() => col.sortable !== false && table.handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {table.sortKey === col.key && (
                            <span className="text-secondary-400">{table.sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.data.map((row) => (
                    <tr key={row.id} className="border-b border-primary-50 last:border-b-0 hover:bg-primary-50/60 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.align === 'right' ? 'text-right' : ''}`}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-500">
            <p>
              Showing <span className="font-medium text-primary-900">{(table.page - 1) * table.pageSize + 1}–{Math.min(table.page * table.pageSize, table.totalCount)}</span> of{' '}
              <span className="font-medium text-primary-900">{table.totalCount}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.setPage(table.page - 1)}
                disabled={table.page <= 1}
                className="btn-secondary btn-sm disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: table.totalPages }).slice(0, 7).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => table.setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    table.page === i + 1 ? 'bg-secondary-500 text-primary-900 font-bold shadow-sm' : 'text-slate-600 hover:bg-primary-50'
                  }`}
                  aria-label={`Page ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => table.setPage(table.page + 1)}
                disabled={table.page >= table.totalPages}
                className="btn-secondary btn-sm disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
