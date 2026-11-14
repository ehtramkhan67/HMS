import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Search, Eye, CheckCircle2, Pill, History,
  ChevronLeft, ChevronRight, Package, AlertTriangle, Clock,
  Stethoscope, MessageSquare,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Badge, Avatar, StatCard } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, SearchEmpty, EmptyState } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Textarea } from '../components/FormFields';
import { Alert } from '../components/Toast';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { isNearExpiry, isExpired, formatDate, formatDateTime, timeAgo } from '../utils/helpers';

/**
 * Physician Portal
 * -----------------
 * Workflow: SMO writes a prescription in Consultation → it appears here as
 * Pending → Physician reviews details and marks it Dispensed (stock decremented)
 * → record moves to the Dispensing History log.
 *
 * Tabs: Pending | Medicine Stock | Dispensing History
 */
export default function CompounderPortal() {
  const toast = useToast();
  const { user } = useAuth();

  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [dispensed, setDispensed] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDispense, setShowDispense] = useState(false);
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [dispensing, setDispensing] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, d, s] = await Promise.all([
        api.getPrescriptions({ status: 'Pending' }),
        api.getPrescriptions({ status: 'Dispensed' }),
        api.getMedicines(),
      ]);
      setPending(p);
      setDispensed(d);
      setStock(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filtering ──
  const filteredPending = useMemo(() => {
    if (!search.trim()) return pending;
    const q = search.toLowerCase();
    return pending.filter(p =>
      (p.kitNumber && p.kitNumber.toLowerCase().includes(q)) ||
      p.cadetName.toLowerCase().includes(q) ||
      p.collegeNumber.toLowerCase().includes(q) ||
      p.rxNumber.toLowerCase().includes(q)
    );
  }, [pending, search]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return dispensed;
    const q = historySearch.toLowerCase();
    return dispensed.filter(p =>
      (p.kitNumber && p.kitNumber.toLowerCase().includes(q)) ||
      p.cadetName.toLowerCase().includes(q) ||
      p.collegeNumber.toLowerCase().includes(q) ||
      p.rxNumber.toLowerCase().includes(q) ||
      (p.dispensedBy && p.dispensedBy.toLowerCase().includes(q))
    );
  }, [dispensed, historySearch]);

  const filteredStock = useMemo(() => {
    if (!stockSearch.trim()) return stock;
    const q = stockSearch.toLowerCase();
    return stock.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  }, [stock, stockSearch]);

  // Pagination for pending list
  const totalPages = Math.max(1, Math.ceil(filteredPending.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedPending = filteredPending.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = {
    pending: pending.length,
    dispensed: dispensed.length,
    lowStock: stock.filter(m => m.stock < m.minStock).length,
    nearExpiry: stock.filter(m => isNearExpiry(m.expiry, 90) && !isExpired(m.expiry)).length,
  };

  // ── Actions ──
  const openDetail = (rx) => { setSelected(rx); setShowDetail(true); };

  const openDispense = (rx) => {
    setSelected(rx);
    setDispenseNotes('');
    setShowDispense(true);
  };

  const confirmDispense = async () => {
    if (!selected) return;
    setDispensing(true);
    try {
      const updated = await api.dispensePrescription(selected.id, {
        dispensedBy: user?.name || 'Physician',
        notes: dispenseNotes,
      });
      setPending(prev => prev.filter(p => p.id !== selected.id));
      setDispensed(prev => [updated, ...prev]);
      // Refresh stock (dispensing decrements it)
      const freshStock = await api.getMedicines();
      setStock(freshStock);
      setShowDispense(false);
      setShowDetail(false);
      setSelected(null);
      toast.success(`${updated.rxNumber} dispensed to ${updated.cadetName}`);
    } catch (err) {
      toast.error(err.message || 'Failed to dispense');
    } finally {
      setDispensing(false);
    }
  };

  if (loading) return <Loading message="Loading Physician Portal…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Physician Portal"
        subtitle="Review SMO prescriptions, dispense medicines, and manage stock"
        actions={
          <button onClick={load} className="btn-secondary btn-sm">Refresh</button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} iconBg="bg-blue-50 text-blue-600" value={stats.pending} label="Pending Prescriptions" />
        <StatCard icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" value={stats.dispensed} label="Dispensed (all time)" />
        <StatCard icon={AlertTriangle} iconBg="bg-red-50 text-red-600" value={stats.lowStock} label="Low Stock Items" />
        <StatCard icon={Package} iconBg="bg-amber-50 text-amber-600" value={stats.nearExpiry} label="Near Expiry" />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" role="tablist" aria-label="Physician sections">
          <button
            role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'pending' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <ClipboardList size={16} /> Pending Prescriptions
            {pending.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary-100 text-primary-900 text-xs font-bold">{pending.length}</span>
            )}
          </button>
          <button
            role="tab" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'stock' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <Pill size={16} /> Medicine Stock
          </button>
          <button
            role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'history' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <History size={16} /> Dispensing History
          </button>
        </nav>
      </div>

      {/* ── PENDING PRESCRIPTIONS ── */}
      {tab === 'pending' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-md">
              <input
                type="search" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by Kit Number, name, RX no…"
                className="input pl-9" aria-label="Search pending prescriptions"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-sm text-slate-500 self-center">{filteredPending.length} pending</p>
          </div>

          {filteredPending.length === 0 && (
            search
              ? <SearchEmpty query={search} />
              : <EmptyState
                  icon={CheckCircle2}
                  title="No pending prescriptions"
                  message="All SMO prescriptions have been dispensed. New ones will appear here after a consultation is saved."
                />
          )}

          {paginatedPending.length > 0 && (
            <>
              <div className="space-y-4">
                {paginatedPending.map(rx => (
                  <Card key={rx.id}>
                    <CardBody>
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <Avatar name={rx.cadetName} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">{rx.cadetName}</span>
                            <Badge variant="primary">{rx.rxNumber}</Badge>
                            <StatusBadge status={rx.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                            <span className="font-mono font-medium text-primary-700">Kit: {rx.kitNumber}</span>
                            <span>{rx.kitNumber || '—'}</span>
                            <span>{rx.houseName}</span>
                            <span>{rx.className}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Stethoscope size={12} /> {rx.prescribedBy}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(rx.prescribedAt)}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-2">
                            <span className="font-medium">Dx:</span> {rx.diagnosis.code} — {rx.diagnosis.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {rx.items.map((it, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                                {it.medicine}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2 shrink-0">
                          <button onClick={() => openDetail(rx)} className="btn-secondary btn-sm">
                            <Eye size={14} /> Details
                          </button>
                          <button onClick={() => openDispense(rx)} className="btn-primary btn-sm">
                            <CheckCircle2 size={14} /> Dispense
                          </button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                  <p>Page {safePage} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                      className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous page">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                      className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next page">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── MEDICINE STOCK ── */}
      {tab === 'stock' && (
        <>
          <div className="relative max-w-md mb-5">
            <input
              type="search" value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Search medicines…" className="input pl-9" aria-label="Search stock"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {filteredStock.length === 0 && <SearchEmpty query={stockSearch} />}

          {filteredStock.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Medicine</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Batch</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Expiry</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">In Stock</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Min</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map(m => {
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
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.batchNo}</td>
                          <td className={`px-4 py-3 ${isExp ? 'text-red-600 font-semibold' : expiring ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                            {formatDate(m.expiry)}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${low ? 'text-red-600' : 'text-slate-800'}`}>
                            {m.stock} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{m.minStock}</td>
                          <td className="px-4 py-3">
                            {isExp ? <Badge variant="danger">Expired</Badge>
                              : low ? <Badge variant="danger">Low Stock</Badge>
                              : expiring ? <Badge variant="warning">Near Expiry</Badge>
                              : <Badge variant="success">In Stock</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DISPENSING HISTORY ── */}
      {tab === 'history' && (
        <>
          <div className="relative max-w-md mb-5">
            <input
              type="search" value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by Kit Number, name, RX no…"
              className="input pl-9" aria-label="Search dispensing history"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {filteredHistory.length === 0 && (
            historySearch ? <SearchEmpty query={historySearch} />
              : <EmptyState icon={History} title="No dispensing history" message="Dispensed prescriptions will appear here." />
          )}

          {filteredHistory.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">RX No</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cadet</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Kit No</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Medicines</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Dispensed By</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Dispensed At</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(rx => (
                      <tr key={rx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-primary-700 font-medium">{rx.rxNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{rx.cadetName}</p>
                          <p className="text-xs text-slate-500">{rx.kitNumber || '—'}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{rx.kitNumber}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-56">
                          <span className="text-xs">{rx.items.map(i => i.medicine).join(', ')}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{rx.dispensedBy}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{formatDateTime(rx.dispensedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openDetail(rx)} className="btn-secondary btn-sm">
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PRESCRIPTION DETAIL MODAL ── */}
      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Prescription ${selected?.rxNumber || ''}`}
        footer={
          <>
            <button onClick={() => setShowDetail(false)} className="btn-secondary">Close</button>
            {selected?.status === 'Pending' && (
              <button onClick={() => { setShowDetail(false); openDispense(selected); }} className="btn-primary">
                <CheckCircle2 size={14} /> Dispense Now
              </button>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Cadet info */}
            <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
              <Avatar name={selected.cadetName} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">{selected.cadetName}</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                  <div><span className="text-slate-400">Kit No:</span> <span className="font-mono font-semibold text-primary-700">{selected.kitNumber}</span></div>
                  <div><span className="text-slate-400">Kit No:</span> {selected.kitNumber || '—'}</div>
                  <div><span className="text-slate-400">House:</span> {selected.houseName}</div>
                  <div><span className="text-slate-400">Class:</span> {selected.className}</div>
                </div>
              </div>
            </div>

            {/* Doctor info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Stethoscope size={14} className="text-slate-400" />
                Prescribed by <span className="font-medium text-slate-800">{selected.prescribedBy}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={14} className="text-slate-400" />
                {formatDateTime(selected.prescribedAt)}
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-xs font-bold text-primary-900 uppercase mb-1">Diagnosis (ICD-10)</p>
              <p className="text-sm"><span className="font-mono font-bold text-primary-900">{selected.diagnosis.code}</span> — {selected.diagnosis.name}</p>
              {selected.symptoms?.length > 0 && (
                <p className="text-xs text-slate-600 mt-1">Symptoms: {selected.symptoms.join(', ')}</p>
              )}
            </div>

            {/* Medicines */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <Pill size={12} /> Medicines ({selected.items.length})
              </p>
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{i + 1}. {item.medicine}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                          <span><span className="text-slate-400">Dose:</span> {item.dose}</span>
                          <span><span className="text-slate-400">Frequency:</span> {item.frequency}</span>
                          <span><span className="text-slate-400">Duration:</span> {item.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {selected.instructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-1 flex items-center gap-1.5">
                  <MessageSquare size={12} /> SMO Instructions
                </p>
                <p className="text-sm text-slate-700">{selected.instructions}</p>
              </div>
            )}

            {/* Dispense info (if already dispensed) */}
            {selected.status === 'Dispensed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">Dispensing Record</p>
                <p className="text-sm text-slate-700">
                  Dispensed by <span className="font-medium">{selected.dispensedBy}</span> on {formatDateTime(selected.dispensedAt)}
                </p>
                {selected.dispenseNotes && (
                  <p className="text-xs text-slate-600 mt-1">Notes: {selected.dispenseNotes}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── CONFIRM DISPENSE MODAL ── */}
      <Modal
        open={showDispense}
        onClose={() => setShowDispense(false)}
        title="Confirm Dispensing"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowDispense(false)} className="btn-secondary" disabled={dispensing}>Cancel</button>
            <button onClick={confirmDispense} className="btn-primary" disabled={dispensing}>
              {dispensing ? 'Dispensing…' : <><CheckCircle2 size={14} /> Confirm Dispense</>}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <Alert type="info" title="Dispensing to cadet">
              You are about to dispense <strong>{selected.rxNumber}</strong> to{' '}
              <strong>{selected.cadetName}</strong> (Kit: <strong>{selected.kitNumber}</strong>).
              Stock will be decremented for {selected.items.length} medicine(s).
            </Alert>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {selected.items.map((item, i) => (
                <div key={i} className="px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">{item.medicine}</p>
                  <p className="text-xs text-slate-500">{item.dose} · {item.frequency} · {item.duration}</p>
                </div>
              ))}
            </div>

            <FormField label="Dispensing Notes (optional)" id="dispense-notes" hint="e.g. full course handed over, cadet briefed">
              <Textarea
                id="dispense-notes"
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                placeholder="Any notes about this dispensing…"
                rows={3}
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
