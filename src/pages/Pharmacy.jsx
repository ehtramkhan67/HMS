import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Clock, Package, Plus, Search,
  ArrowDownToLine, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../components/UI';
import { Loading, ErrorState, SearchEmpty } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Input, Select } from '../components/FormFields';
import { Alert } from '../components/Toast';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { medicines } from '../data/medicines';
import { cadets } from '../data/cadets';
import { validateForm, isNearExpiry, isExpired, daysUntil, formatDate } from '../utils/helpers';
import { useSyncRefresh } from '../utils/sync';
import DeleteButton from '../components/DeleteButton';

export default function Pharmacy() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showAddStock, setShowAddStock] = useState(false);
  const [showDispense, setShowDispense] = useState(false);
  const [stockForm, setStockForm] = useState({ medicineId: '', batchNo: '', expiry: '', quantity: '', price: '' });
  const [dispenseForm, setDispenseForm] = useState({ cadetId: '', items: [{ medicineId: '', qty: 1 }] });
  const [errors, setErrors] = useState({});
  const pageSize = 12;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await api.getMedicines();
      setData(d);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  // Live sync: re-render with fresh data when another device changes it.
  useSyncRefresh(load);

  const handleDeleteMedicine = async (m) => {
    try {
      await api.deleteMedicine(m.id);
      setData(prev => prev.filter(x => x.id !== m.id));
      toast.success(`${m.name} removed from inventory permanently`);
    } catch {
      toast.error('Failed to delete medicine');
    }
  };

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    if (filter === 'low') result = result.filter(m => m.stock < m.minStock);
    if (filter === 'near-expiry') result = result.filter(m => isNearExpiry(m.expiry, 90) && !isExpired(m.expiry));
    if (filter === 'expired') result = result.filter(m => isExpired(m.expiry));
    return result;
  }, [data, search, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (typeof a[sortKey] === 'number') cmp = a[sortKey] - b[sortKey];
      else cmp = String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const lowStock = data.filter(m => m.stock < m.minStock);
  const nearExpiry = data.filter(m => isNearExpiry(m.expiry, 90) && !isExpired(m.expiry));
  const expired = data.filter(m => isExpired(m.expiry));

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      medicineId: [{ type: 'required', message: 'Select a medicine' }],
      batchNo: [{ type: 'required', message: 'Batch number is required' }],
      expiry: [{ type: 'required', message: 'Expiry date is required' }],
      quantity: [{ type: 'required', message: 'Quantity is required' }, { type: 'positive', message: 'Must be > 0' }],
    }, stockForm);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.adjustStock(stockForm.medicineId, Number(stockForm.quantity));
      setData(prev => prev.map(m => m.id === stockForm.medicineId ? { ...m, stock: m.stock + Number(stockForm.quantity) } : m));
      setShowAddStock(false);
      setStockForm({ medicineId: '', batchNo: '', expiry: '', quantity: '', price: '' });
      toast.success('Stock added successfully');
    } catch {
      toast.error('Failed to add stock');
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      cadetId: [{ type: 'required', message: 'Select a cadet' }],
    }, dispenseForm);
    if (!dispenseForm.items[0].medicineId) errs.items = 'Select at least one medicine';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.dispenseMedicine(dispenseForm);
      setShowDispense(false);
      setDispenseForm({ cadetId: '', items: [{ medicineId: '', qty: 1 }] });
      toast.success('Medicines dispensed successfully');
    } catch {
      toast.error('Dispensing failed');
    }
  };

  if (loading) return <Loading message="Loading pharmacy inventory…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Pharmacy & Inventory"
        subtitle="Stock management, batch tracking, and dispensing"
        actions={
          <>
            <button onClick={() => { setErrors({}); setShowDispense(true); }} className="btn-secondary btn-sm">
              <ArrowDownToLine size={14} /> Dispense
            </button>
            <button onClick={() => { setErrors({}); setShowAddStock(true); }} className="btn-primary btn-sm">
              <Plus size={14} /> Add Stock
            </button>
          </>
        }
      />

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-red-400">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-900">{lowStock.length}</p>
            <p className="text-xs text-slate-500">Low Stock Items</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-amber-400">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-900">{nearExpiry.length}</p>
            <p className="text-xs text-slate-500">Near Expiry (90 days)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-slate-400">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Package size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-900">{expired.length}</p>
            <p className="text-xs text-slate-500">Expired Items</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <input
            type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search medicines…" className="input pl-9" aria-label="Search medicines"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="input w-auto" aria-label="Filter inventory">
          <option value="all">All Items</option>
          <option value="low">Low Stock</option>
          <option value="near-expiry">Near Expiry</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {sorted.length === 0 && (search || filter !== 'all') && <SearchEmpty query={search || filter} />}

      {/* Stock table */}
      {sorted.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {[
                      { key: 'name', label: 'Medicine' },
                      { key: 'category', label: 'Category' },
                      { key: 'expiry', label: 'Expiry' },
                      { key: 'stock', label: 'Stock' },
                      { key: 'minStock', label: 'Min' },
                    ].map(col => (
                      <th key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs cursor-pointer select-none hover:text-slate-700"
                      >
                        {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(m => {
                    const low = m.stock < m.minStock;
                    const expiring = isNearExpiry(m.expiry, 90) && !isExpired(m.expiry);
                    const isExp = isExpired(m.expiry);
                    return (
                      <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.genericName}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.category}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${isExp ? 'text-red-600 font-semibold' : expiring ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                            {formatDate(m.expiry)}
                          </span>
                          {!isExp && <p className="text-[10px] text-slate-400">{daysUntil(m.expiry)} days</p>}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${low ? 'text-red-600' : 'text-slate-800'}`}>
                          {m.stock} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{m.minStock}</td>
                        <td className="px-4 py-3 text-right">
                          <DeleteButton onConfirm={() => handleDeleteMedicine(m)} label="Delete this medicine permanently" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <p>Page {page} of {totalPages} — {sorted.length} items</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next page"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}

      {/* Add Stock modal */}
      <Modal open={showAddStock} onClose={() => setShowAddStock(false)} title="Add / Adjust Stock"
        footer={<>
          <button onClick={() => setShowAddStock(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddStock} className="btn-primary"><Plus size={14} /> Add Stock</button>
        </>}>
        <form onSubmit={handleAddStock} className="space-y-4">
          <FormField label="Medicine" required error={errors.medicineId} id="stock-med">
            <Select id="stock-med" value={stockForm.medicineId}
              onChange={(e) => setStockForm(f => ({ ...f, medicineId: e.target.value }))} error={errors.medicineId}>
              <option value="">Select medicine…</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (current: {m.stock})</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Batch No." required error={errors.batchNo} id="stock-batch">
              <Input id="stock-batch" value={stockForm.batchNo}
                onChange={(e) => setStockForm(f => ({ ...f, batchNo: e.target.value }))}
                placeholder="BATCH-001" error={errors.batchNo} />
            </FormField>
            <FormField label="Expiry Date" required error={errors.expiry} id="stock-exp">
              <Input id="stock-exp" type="date" value={stockForm.expiry}
                onChange={(e) => setStockForm(f => ({ ...f, expiry: e.target.value }))} error={errors.expiry} />
            </FormField>
            <FormField label="Quantity" required error={errors.quantity} id="stock-qty">
              <Input id="stock-qty" type="number" value={stockForm.quantity}
                onChange={(e) => setStockForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="100" error={errors.quantity} />
            </FormField>
            <FormField label="Unit Price (Rs)" id="stock-price">
              <Input id="stock-price" type="number" step="0.01" value={stockForm.price}
                onChange={(e) => setStockForm(f => ({ ...f, price: e.target.value }))} placeholder="5.00" />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Dispense modal */}
      <Modal open={showDispense} onClose={() => setShowDispense(false)} title="Dispense Medicines"
        footer={<>
          <button onClick={() => setShowDispense(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleDispense} className="btn-primary"><ArrowDownToLine size={14} /> Dispense</button>
        </>}>
        <form onSubmit={handleDispense} className="space-y-4">
          <FormField label="Cadet" required error={errors.cadetId} id="disp-cadet">
            <Select id="disp-cadet" value={dispenseForm.cadetId}
              onChange={(e) => setDispenseForm(f => ({ ...f, cadetId: e.target.value }))} error={errors.cadetId}>
              <option value="">Select cadet…</option>
              {cadets.map(c => <option key={c.id} value={c.id}>{c.name} ({c.kitNumber || '—'})</option>)}
            </Select>
          </FormField>
          {dispenseForm.items.map((item, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Item {i + 1}</span>
                {dispenseForm.items.length > 1 && (
                  <button type="button" onClick={() => setDispenseForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                    className="text-red-500 text-xs">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Medicine" required id={`disp-med-${i}`} className="col-span-2">
                  <Select id={`disp-med-${i}`} value={item.medicineId}
                    onChange={(e) => setDispenseForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, medicineId: e.target.value } : it) }))}>
                    <option value="">Select…</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock} left)</option>)}
                  </Select>
                </FormField>
                <FormField label="Qty" required id={`disp-qty-${i}`}>
                  <Input id={`disp-qty-${i}`} type="number" min="1" value={item.qty}
                    onChange={(e) => setDispenseForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, qty: Number(e.target.value) } : it) }))} />
                </FormField>
              </div>
            </div>
          ))}
          {errors.items && <Alert type="error">{errors.items}</Alert>}
          <button type="button"
            onClick={() => setDispenseForm(f => ({ ...f, items: [...f.items, { medicineId: '', qty: 1 }] }))}
            className="btn-secondary btn-sm w-full justify-center">
            <Plus size={14} /> Add Another Item
          </button>
        </form>
      </Modal>
    </div>
  );
}
