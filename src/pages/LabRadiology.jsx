import { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Plus, Search, ChevronLeft, ChevronRight,
  TestTube, Camera, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { PageHeader, Avatar, StatCard } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, SearchEmpty } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Input, Select, Textarea } from '../components/FormFields';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { labTestCatalog } from '../data/labOrders';
import { cadets } from '../data/cadets';
import { validateForm, formatDate } from '../utils/helpers';

export default function LabRadiology() {
  const toast = useToast();
  const { role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resultForm, setResultForm] = useState({ resultText: '', notes: '' });
  const [orderForm, setOrderForm] = useState({ cadetId: '', testCode: '', priority: 'Routine', orderedBy: '' });
  const [errors, setErrors] = useState({});
  const pageSize = 10;

  const canModify = ['lab', 'admin'].includes(role);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getLabOrders();
      setOrders(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.cadetName.toLowerCase().includes(q) ||
        o.collegeNumber.toLowerCase().includes(q) ||
        o.testName.toLowerCase().includes(q) ||
        o.testCode.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    return result;
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    ordered: orders.filter(o => o.status === 'Ordered').length,
    sample: orders.filter(o => o.status === 'Sample Taken').length,
    completed: orders.filter(o => o.status === 'Completed').length,
    pending: orders.filter(o => o.status !== 'Completed').length,
  };

  const handleStatusChange = async (order, newStatus) => {
    try {
      await api.updateLabOrder(order.id, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      toast.success(`${order.testName} → ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleEnterResult = (order) => {
    setSelectedOrder(order);
    setResultForm({ resultText: order.result ? Object.entries(order.result).map(([k, v]) => `${k}: ${v}`).join('\n') : '', notes: '' });
    setErrors({});
    setShowResult(true);
  };

  const saveResult = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      resultText: [{ type: 'required', message: 'Enter the result' }],
    }, resultForm);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const resultLines = resultForm.resultText.split('\n').filter(Boolean);
      const resultObj = {};
      resultLines.forEach(line => {
        const [key, ...val] = line.split(':');
        if (key && val.length) resultObj[key.trim()] = val.join(':').trim();
      });
      await api.updateLabOrder(selectedOrder.id, { status: 'Completed', result: resultObj, notes: resultForm.notes, completedAt: new Date().toISOString() });
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Completed', result: resultObj } : o));
      setShowResult(false);
      toast.success('Result saved and order completed');
    } catch {
      toast.error('Failed to save result');
    }
  };

  const handleNewOrder = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      cadetId: [{ type: 'required', message: 'Select a cadet' }],
      testCode: [{ type: 'required', message: 'Select a test' }],
      orderedBy: [{ type: 'required', message: 'Ordering doctor is required' }],
    }, orderForm);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const test = labTestCatalog.find(t => t.code === orderForm.testCode);
      const cadet = cadets.find(c => c.id === orderForm.cadetId);
      const newOrder = await api.createLabOrder({
        ...orderForm,
        cadetName: cadet.name,
        collegeNumber: cadet.collegeNumber,
        kitNumber: cadet.kitNumber,
        testName: test.name,
        category: test.category,
        price: test.price,
        orderDate: new Date().toISOString().split('T')[0],
        isRadiology: test.category === 'Radiology',
      });
      setOrders(prev => [newOrder, ...prev]);
      setShowNewOrder(false);
      setOrderForm({ cadetId: '', testCode: '', priority: 'Routine', orderedBy: '' });
      toast.success('Lab order created');
    } catch {
      toast.error('Failed to create order');
    }
  };

  if (loading) return <Loading message="Loading lab orders…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Lab & Radiology"
        subtitle="Test orders, sample collection, and result entry"
        actions={
          canModify && role !== 'admin' ? (
            <button onClick={() => { setErrors({}); setShowNewOrder(true); }} className="btn-primary btn-sm">
              <Plus size={14} /> New Order
            </button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} iconBg="bg-slate-100 text-slate-600" value={stats.ordered} label="Ordered" />
        <StatCard icon={TestTube} iconBg="bg-primary-50 text-primary-900 border border-primary-100" value={stats.sample} label="Sample Taken" />
        <StatCard icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" value={stats.completed} label="Completed" />
        <StatCard icon={AlertCircle} iconBg="bg-amber-50 text-amber-600" value={stats.pending} label="Pending" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by patient, test, code…" className="input pl-9" aria-label="Search lab orders" />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto" aria-label="Filter by status">
          <option value="all">All Statuses</option>
          <option value="Ordered">Ordered</option>
          <option value="Sample Taken">Sample Taken</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 && (search || statusFilter !== 'all') && <SearchEmpty query={search || statusFilter} />}

      {filtered.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Patient</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Test</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Ordered</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(o => (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={o.cadetName} size="sm" />
                          <div>
                            <p className="font-medium text-slate-800">{o.cadetName}</p>
                            <p className="text-xs text-slate-500">{o.kitNumber || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{o.testName}</p>
                        <p className="text-xs font-mono text-primary-600">{o.testCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex items-center gap-1">
                          {o.isRadiology ? <Camera size={12} /> : <FlaskConical size={12} />}
                          {o.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {canModify && o.status === 'Ordered' && (
                          <button onClick={() => handleStatusChange(o, 'Sample Taken')} className="btn-secondary btn-sm">Take Sample</button>
                        )}
                        {canModify && o.status === 'Sample Taken' && (
                          <button onClick={() => handleEnterResult(o)} className="btn-primary btn-sm">Enter Result</button>
                        )}
                        {o.status === 'Completed' && o.result && (
                          <button onClick={() => handleEnterResult(o)} className="btn-secondary btn-sm">View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <p>Page {page} of {totalPages} — {filtered.length} orders</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}

      {/* Result entry modal */}
      <Modal open={showResult} onClose={() => setShowResult(false)} title={`Result — ${selectedOrder?.testName || ''}`}
        footer={<>
          <button onClick={() => setShowResult(false)} className="btn-secondary">Cancel</button>
          {canModify && selectedOrder?.status !== 'Completed' && (
            <button onClick={saveResult} className="btn-primary"><CheckCircle2 size={14} /> Save & Complete</button>
          )}
        </>}>
        <div className="space-y-4">
          {selectedOrder && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <p><span className="text-slate-500">Patient:</span> {selectedOrder.cadetName} ({selectedOrder.kitNumber || '—'})</p>
              <p><span className="text-slate-500">Test:</span> {selectedOrder.testName} ({selectedOrder.testCode})</p>
              <p><span className="text-slate-500">Ordered by:</span> {selectedOrder.orderedBy}</p>
            </div>
          )}
          <form onSubmit={saveResult} className="space-y-4">
            <FormField label="Result" required error={errors.resultText} id="lab-result"
              hint="One per line: Parameter: Value">
              <Textarea id="lab-result" value={resultForm.resultText}
                onChange={(e) => setResultForm(f => ({ ...f, resultText: e.target.value }))}
                placeholder="Hemoglobin: 13.5 g/dL&#10;WBC: 7,200 /µL&#10;Platelets: 250,000 /µL"
                rows={6} error={errors.resultText}
                readOnly={!canModify || selectedOrder?.status === 'Completed'} />
            </FormField>
            <FormField label="Notes" id="lab-notes">
              <Input id="lab-notes" value={resultForm.notes}
                onChange={(e) => setResultForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional observations"
                readOnly={!canModify || selectedOrder?.status === 'Completed'} />
            </FormField>
          </form>
        </div>
      </Modal>

      {/* New order modal */}
      <Modal open={showNewOrder} onClose={() => setShowNewOrder(false)} title="New Lab / Radiology Order"
        footer={<>
          <button onClick={() => setShowNewOrder(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleNewOrder} className="btn-primary"><Plus size={14} /> Create Order</button>
        </>}>
        <form onSubmit={handleNewOrder} className="space-y-4">
          <FormField label="Cadet" required error={errors.cadetId} id="lo-cadet">
            <Select id="lo-cadet" value={orderForm.cadetId}
              onChange={(e) => setOrderForm(f => ({ ...f, cadetId: e.target.value }))} error={errors.cadetId}>
              <option value="">Select cadet…</option>
              {cadets.map(c => <option key={c.id} value={c.id}>{c.name} ({c.kitNumber || '—'})</option>)}
            </Select>
          </FormField>
          <FormField label="Test" required error={errors.testCode} id="lo-test">
            <Select id="lo-test" value={orderForm.testCode}
              onChange={(e) => setOrderForm(f => ({ ...f, testCode: e.target.value }))} error={errors.testCode}>
              <option value="">Select test…</option>
              <optgroup label="Pathology / Biochemistry">
                {labTestCatalog.filter(t => t.category !== 'Radiology').map(t => (
                  <option key={t.code} value={t.code}>{t.name} — Rs {t.price}</option>
                ))}
              </optgroup>
              <optgroup label="Radiology">
                {labTestCatalog.filter(t => t.category === 'Radiology').map(t => (
                  <option key={t.code} value={t.code}>{t.name} — Rs {t.price}</option>
                ))}
              </optgroup>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Priority" id="lo-pri">
              <Select id="lo-pri" value={orderForm.priority}
                onChange={(e) => setOrderForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
              </Select>
            </FormField>
            <FormField label="Ordered By" required error={errors.orderedBy} id="lo-doc">
              <Select id="lo-doc" value={orderForm.orderedBy}
                onChange={(e) => setOrderForm(f => ({ ...f, orderedBy: e.target.value }))} error={errors.orderedBy}>
                <option value="">Select doctor…</option>
                <option value="Dr. Ahmed Raza">Dr. Ahmed Raza</option>
                <option value="Dr. Sana Malik">Dr. Sana Malik</option>
                <option value="Dr. Imran Qureshi">Dr. Imran Qureshi</option>
                <option value="Dr. Fatima Noor">Dr. Fatima Noor</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
