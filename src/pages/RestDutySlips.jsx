import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Printer, Search, ChevronLeft, ChevronRight,
  Bell, Moon, Activity, Timer,
} from 'lucide-react';
import { PageHeader, Badge, Avatar, StatCard } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, SearchEmpty } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Input, Textarea } from '../components/FormFields';
import { PrintWrapper, SignatureLine } from '../components/PrintWrapper';
import { Alert } from '../components/Toast';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { cadets, recordHouse } from '../data/cadets';
import { validateForm, formatDate } from '../utils/helpers';
import { useKitAutofill } from '../utils/useKitAutofill';

const slipTypes = [
  { value: 'Rest', label: 'Rest', icon: Moon, description: 'Complete rest from all academic and physical activities' },
  { value: 'Light Duty', label: 'Light Duty', icon: Activity, description: 'Exempt from heavy physical work; light duties only' },
  { value: 'Excused from PT/Sports', label: 'Excused from PT/Sports', icon: Timer, description: 'Exempt from physical training and sports activities' },
];

export default function RestDutySlips() {
  const toast = useToast();
  const { user, role } = useAuth();
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showIssue, setShowIssue] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlip, setPreviewSlip] = useState(null);
  const [form, setForm] = useState({ cadetId: '', kitNumber: '', houseName: '', type: 'Rest', reason: '', fromDate: '', toDate: '' });

  // Kit → cadet name + house autofill (same flow as Consultation).
  useKitAutofill(form, setForm, { nameKey: 'cadetId', houseKey: 'houseName' });
  const [errors, setErrors] = useState({});
  const pageSize = 10;

  const canIssue = ['doctor', 'admin'].includes(role);
  // House Masters only view slips from their own house.
  const houseScope = role === 'houseMaster' ? (user?.houseName || '') : '';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getRestDutySlips();
      setSlips(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Normalised match: records may store "Ayub" while the user's house
  // is "Ayub House" — recordHouse resolves both (and falls back to
  // the cadet directory when the record has no usable house field).
  const scopedSlips = useMemo(
    () => (houseScope ? slips.filter(s => recordHouse(s) === houseScope) : slips),
    [slips, houseScope]
  );

  const filtered = useMemo(() => {
    let result = scopedSlips;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.cadetName.toLowerCase().includes(q) || (s.collegeNumber || '').toLowerCase().includes(q) || (s.kitNumber && s.kitNumber.toLowerCase().includes(q)) || (s.houseName || '').toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') result = result.filter(s => s.type === typeFilter);
    return result;
  }, [scopedSlips, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    active: scopedSlips.filter(s => s.status === 'Active').length,
    rest: scopedSlips.filter(s => s.type === 'Rest' && s.status === 'Active').length,
    light: scopedSlips.filter(s => s.type === 'Light Duty' && s.status === 'Active').length,
    excused: scopedSlips.filter(s => s.type === 'Excused from PT/Sports' && s.status === 'Active').length,
  };

  const validate = () => {
    const errs = validateForm({
      cadetId: [{ type: 'required', message: 'Enter a cadet name' }],
      type: [{ type: 'required', message: 'Select slip type' }],
      reason: [
        { type: 'required', message: 'Reason is required' },
        { type: 'min', value: 5, message: 'Provide a clear reason (min 5 chars)' },
      ],
      fromDate: [{ type: 'required', message: 'From date is required' }],
      toDate: [{ type: 'required', message: 'To date is required' }],
    }, form);

    if (form.fromDate && form.toDate && new Date(form.toDate) < new Date(form.fromDate)) {
      errs.toDate = 'To date must be after From date';
    }
    if (form.fromDate && form.toDate) {
      const days = Math.ceil((new Date(form.toDate) - new Date(form.fromDate)) / 86400000);
      if (days > 14) errs.toDate = 'Maximum slip duration is 14 days';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const q = form.cadetId.trim();
      const kit = form.kitNumber.trim();
      const house = form.houseName.trim();
      const cadet = cadets.find(c =>
        c.name.toLowerCase() === q.toLowerCase() ||
        c.collegeNumber.toLowerCase() === q.toLowerCase() ||
        (kit && c.kitNumber && c.kitNumber.toLowerCase() === kit.toLowerCase())
      ) || cadets.find(c => c.name.toLowerCase().includes(q.toLowerCase()))
        || await api.registerCadet({ name: q, kitNumber: kit, houseName: house });
      if (cadet && house && (cadet.houseName === 'Unassigned' || !cadet.houseName)) {
        await api.registerCadet({ name: cadet.name, kitNumber: cadet.kitNumber, houseName: house });
      }
      const duration = Math.ceil((new Date(form.toDate) - new Date(form.fromDate)) / 86400000) + 1;
      const slip = await api.createRestDutySlip({
        ...form,
        cadetId: cadet.id,
        kitNumber: kit || cadet.kitNumber,
        cadetName: cadet.name,
        collegeNumber: cadet.collegeNumber,
        houseName: house || cadet.houseName,
        className: cadet.className,
        issueDate: new Date().toISOString().split('T')[0],
        duration,
        issuedBy: user?.name || 'Doctor',
        notifiedHouseMaster: true,
      });
      setSlips(prev => [slip, ...prev.filter(s => s.id !== slip.id)]);
      setShowIssue(false);
      setForm({ cadetId: '', kitNumber: '', houseName: '', type: 'Rest', reason: '', fromDate: '', toDate: '' });
      toast.success(`Slip issued for ${cadet.name}`);
      toast.info('House Master has been notified');
    } catch {
      toast.error('Failed to issue slip');
    }
  };

  const handlePreview = (slip) => {
    setPreviewSlip(slip);
    setShowPreview(true);
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 300);
  };

  if (loading) return <Loading message="Loading slips…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="ExcuseDesk"
        subtitle={houseScope ? `Rest, light duty and PT excusal slips — ${houseScope}` : 'Issue and manage rest, light duty, and PT excusal slips'}
        actions={
          canIssue && role !== 'admin' ? (
            <button onClick={() => { setErrors({}); setShowIssue(true); }} className="btn-primary btn-sm">
              <Plus size={14} /> Issue Slip
            </button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} iconBg="bg-blue-50 text-blue-600" value={stats.active} label="Active Slips" />
        <StatCard icon={Moon} iconBg="bg-purple-50 text-purple-600" value={stats.rest} label="Rest" />
        <StatCard icon={Activity} iconBg="bg-amber-50 text-amber-600" value={stats.light} label="Light Duty" />
        <StatCard icon={Timer} iconBg="bg-emerald-50 text-emerald-600" value={stats.excused} label="PT Excused" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by cadet or kit number…" className="input pl-9" aria-label="Search slips" />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="input w-auto" aria-label="Filter by type">
          <option value="all">All Types</option>
          {slipTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <SearchEmpty query={search || typeFilter} />}

      {filtered.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cadet</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Issued By</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={s.cadetName} size="sm" />
                          <div>
                            <p className="font-medium text-slate-800">{s.cadetName}</p>
                            <p className="text-xs text-slate-500">{s.kitNumber || '—'} · {s.houseName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={
                          s.type === 'Rest' ? 'primary' :
                          s.type === 'Light Duty' ? 'warning' : 'success'
                        }>{s.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-48 truncate">{s.reason}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {formatDate(s.fromDate)} → {formatDate(s.toDate)}
                        <p className="text-slate-400">{s.duration} day(s)</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.issuedBy}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => handlePreview(s)} className="btn-secondary btn-sm">
                          <Printer size={14} /> Print
                        </button>
                        {s.notifiedHouseMaster && (
                          <Badge variant="success" className="ml-1"><Bell size={10} className="mr-1" /> Notified</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <p>Page {page} of {totalPages} — {filtered.length} slips</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}

      {/* Issue slip modal */}
      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Issue Rest / Duty Slip"
        footer={<>
          <button onClick={() => setShowIssue(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleIssue} className="btn-primary"><FileText size={14} /> Issue Slip</button>
        </>}>
        <form onSubmit={handleIssue} className="space-y-4">
          <FormField label="Kit Number" id="slip-kit" hint="3–6 digits — auto-fills cadet & house">
            <Input id="slip-kit" value={form.kitNumber} inputMode="numeric"
              onChange={(e) => setForm(f => ({ ...f, kitNumber: e.target.value }))}
              placeholder="e.g. 5701" />
          </FormField>

          <FormField label="Cadet" required error={errors.cadetId} id="slip-cadet" hint="Type cadet name or kit number">
            <Input id="slip-cadet" value={form.cadetId}
              onChange={(e) => setForm(f => ({ ...f, cadetId: e.target.value }))}
              placeholder="e.g. Ali Khan or 5701" error={errors.cadetId} />
          </FormField>

          <FormField label="House" id="slip-house" hint="Cadet's house — auto-fills from kit">
            <Input id="slip-house" value={form.houseName}
              onChange={(e) => setForm(f => ({ ...f, houseName: e.target.value }))}
              placeholder="e.g. Jinnah House" />
          </FormField>

          <FormField label="Slip Type" required error={errors.type} id="slip-type">
            <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Slip type">
              {slipTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={form.type === t.value}
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    form.type === t.value ? 'border-secondary-500 bg-primary-50 ring-1 ring-secondary-500' : 'border-primary-100 hover:border-primary-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    form.type === t.value ? 'bg-primary-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <t.icon size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Reason" required error={errors.reason} id="slip-reason">
            <Textarea id="slip-reason" value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Medical reason for the slip" rows={3} error={errors.reason} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="From Date" required error={errors.fromDate} id="slip-from">
              <Input id="slip-from" type="date" value={form.fromDate}
                onChange={(e) => setForm(f => ({ ...f, fromDate: e.target.value }))} error={errors.fromDate} />
            </FormField>
            <FormField label="To Date" required error={errors.toDate} id="slip-to">
              <Input id="slip-to" type="date" value={form.toDate}
                onChange={(e) => setForm(f => ({ ...f, toDate: e.target.value }))} error={errors.toDate} />
            </FormField>
          </div>

          <Alert type="info" title="House Master Notification">
            Upon issuing, the House Master will receive a notification preview with cadet details and slip period.
          </Alert>
        </form>
      </Modal>

      {/* Printable slip preview */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Printable Slip"
        size="lg"
        footer={<>
          <button onClick={() => setShowPreview(false)} className="btn-secondary">Close</button>
          <button onClick={handlePrint} className="btn-primary"><Printer size={14} /> Print</button>
        </>}>
        {previewSlip && (
          <PrintWrapper title={`${previewSlip.type} Slip`} onPrint={handlePrint}>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Cadet Name</p>
                  <p className="font-semibold text-slate-800">{previewSlip.cadetName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kit Number</p>
                  <p className="font-semibold text-slate-800">{previewSlip.kitNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kit Number</p>
                  <p className="font-semibold text-slate-800">{previewSlip.kitNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">House</p>
                  <p className="font-semibold text-slate-800">{previewSlip.houseName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Class</p>
                  <p className="font-semibold text-slate-800">{previewSlip.className}</p>
                </div>
              </div>

              <div className="border-t border-primary-100 pt-4">
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-secondary-700 uppercase tracking-wider font-bold mb-1">Slip Type</p>
                  <p className="text-lg font-bold text-primary-900">{previewSlip.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Valid From</p>
                  <p className="font-semibold">{formatDate(previewSlip.fromDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valid Until</p>
                  <p className="font-semibold">{formatDate(previewSlip.toDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-semibold">{previewSlip.duration} day(s)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Issue Date</p>
                  <p className="font-semibold">{formatDate(previewSlip.issueDate)}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">Reason</p>
                <p className="mt-1">{previewSlip.reason}</p>
              </div>

              <SignatureLine name={previewSlip.issuedBy} role="Issuing Medical Officer" date={formatDate(previewSlip.issueDate)} />
            </div>
          </PrintWrapper>
        )}

        {/* House Master notification preview */}
        {previewSlip && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Bell size={12} /> House Master Notification Preview
            </p>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
              <p className="text-slate-700">
                📋 <strong>{previewSlip.type} Slip Issued</strong>
                <br />
                Cadet: <strong>{previewSlip.cadetName}</strong> ({previewSlip.kitNumber || '—'})
                <br />
                House: {previewSlip.houseName} | Class: {previewSlip.className}
                <br />
                Period: {formatDate(previewSlip.fromDate)} → {formatDate(previewSlip.toDate)} ({previewSlip.duration} days)
                <br />
                Reason: {previewSlip.reason}
                <br />
                Issued by: {previewSlip.issuedBy}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
