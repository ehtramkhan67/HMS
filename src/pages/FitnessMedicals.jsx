import { useState, useEffect, useMemo } from 'react';
import {
  Ruler, Plus, Search, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Trash2,
} from 'lucide-react';
import { PageHeader, StatCard, Badge, Avatar } from '../components/UI';
import { Loading, ErrorState, SearchEmpty, EmptyState } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Input } from '../components/FormFields';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { houses } from '../data/cadets';
import { formatDate, validateForm } from '../utils/helpers';
import { useKitAutofill } from '../utils/useKitAutofill';

const PAGE_SIZE = 15;

function bmiInfo(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'Underweight', variant: 'warning' };
  if (bmi < 25) return { label: 'Normal', variant: 'success' };
  if (bmi < 30) return { label: 'Overweight', variant: 'warning' };
  return { label: 'Obese', variant: 'danger' };
}

export default function FitnessMedicals() {
  const toast = useToast();
  const { user, role } = useAuth();
  const [cadetsList, setCadetsList] = useState([]);
  const [records, setRecords] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', kitNumber: '', houseName: '' });
  const [addErrors, setAddErrors] = useState({});

  // Kit → cadet name + house autofill from the cadet directory
  // (same flow as Consultation; shared hook, keeps manual typing).
  useKitAutofill(addForm, setAddForm, { nameKey: 'name', houseKey: 'houseName' });
  const [showClear, setShowClear] = useState(false);
  const [clearOpts, setClearOpts] = useState({ measurements: true, cadets: true });
  const [clearing, setClearing] = useState(false);

  const canEdit = ['doctor', 'admin'].includes(role);

  const portalCadets = useMemo(
    () => cadetsList.filter(c => c.registeredVia === 'Annual Medical'),
    [cadetsList]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, m] = await Promise.all([api.getCadets(), api.getAnnualMedical()]);
      const measured = new Set(m.map(r => r.cadetId));
      setCadetsList(c.filter(cd => cd.registeredVia === 'Annual Medical' || measured.has(cd.id)));
      setRecords(m);
      const map = {};
      m.forEach(r => { map[r.cadetId] = { height: String(r.height ?? ''), weight: String(r.weight ?? '') }; });
      setDrafts(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const recordMap = useMemo(() => {
    const m = {};
    records.forEach(r => { m[r.cadetId] = r; });
    return m;
  }, [records]);

  const stats = useMemo(() => {
    const total = cadetsList.length;
    const recorded = Math.min(records.length, total || records.length);
    const pending = Math.max(total - recorded, 0);
    const pct = total ? Math.round((recorded / total) * 100) : 0;
    return { total, recorded, pending, pct };
  }, [cadetsList, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cadetsList.filter(c => {
      if (q && !(c.name.toLowerCase().includes(q) || c.collegeNumber.toLowerCase().includes(q) ||
        (c.kitNumber && c.kitNumber.toLowerCase().includes(q)) || c.houseName.toLowerCase().includes(q))) return false;
      if (statusFilter === 'recorded') return !!recordMap[c.id];
      if (statusFilter === 'pending') return !recordMap[c.id];
      return true;
    });
  }, [cadetsList, search, statusFilter, recordMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setDraft = (cadetId, key, value) =>
    setDrafts(d => ({ ...d, [cadetId]: { ...(d[cadetId] || { height: '', weight: '' }), [key]: value } }));

  const handleSave = async (cadet) => {
    const draft = drafts[cadet.id] || { height: '', weight: '' };
    const errs = validateForm({
      height: [
        { type: 'required', message: 'Height required' },
        { type: 'custom', validator: (v) => {
          const n = Number(v);
          if (isNaN(n) || n < 50 || n > 250) return 'Height must be 50–250 cm';
          return null;
        } },
      ],
      weight: [
        { type: 'required', message: 'Weight required' },
        { type: 'custom', validator: (v) => {
          const n = Number(v);
          if (isNaN(n) || n < 20 || n > 200) return 'Weight must be 20–200 kg';
          return null;
        } },
      ],
    }, { height: draft.height, weight: draft.weight });
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setSavingId(cadet.id);
    try {
      const rec = await api.saveMeasurement({
        cadetId: cadet.id,
        height: draft.height,
        weight: draft.weight,
        measuredBy: user?.name || 'Doctor',
      });
      setRecords(prev => {
        const rest = prev.filter(r => r.cadetId !== cadet.id);
        return [{ ...rec, cadetId: cadet.id }, ...rest];
      });
      toast.success(`Height & weight saved for ${cadet.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to save measurement');
    } finally {
      setSavingId(null);
    }
  };

  const addRules = { name: [{ type: 'required', message: 'Cadet name is required' }] };
  const handleAdd = async (e) => {
    e.preventDefault();
    const errs = validateForm(addRules, addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const cadet = await api.registerCadet({
        name: addForm.name.trim(),
        kitNumber: addForm.kitNumber.trim(),
        houseName: addForm.houseName.trim(),
        source: 'Annual Medical',
      });
      setCadetsList(prev => (prev.some(c => c.id === cadet.id) ? prev : [...prev, cadet]));
      setShowAdd(false);
      setAddForm({ name: '', kitNumber: '', houseName: '' });
      toast.success(`${cadet.name} added to the annual medical list`);
    } catch (err) {
      toast.error(err.message || 'Failed to add cadet');
    }
  };

  const handleClear = async () => {
    if (!clearOpts.measurements && !clearOpts.cadets) {
      toast.error('Select at least one option to clear');
      return;
    }
    setClearing(true);
    try {
      const res = await api.clearAnnualMedicalData({
        clearMeasurementsToo: clearOpts.measurements,
        clearCadetsToo: clearOpts.cadets,
      });
      setShowClear(false);
      await load();
      const parts = [];
      if (clearOpts.measurements) parts.push(`${res.measurements} measurement(s)`);
      if (clearOpts.cadets) parts.push(`${res.removedCadets} cadet(s)`);
      toast.success(`Cleared ${parts.join(' and ')}`);
    } catch (err) {
      toast.error(err.message || 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Annual Medical"
        subtitle={`Yearly height & weight checkup — ${new Date().getFullYear()} (${stats.total} cadets)`}
        actions={canEdit && role !== 'admin' ? (
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setShowClear(true)}>
              <Trash2 size={15} /> Clear All Data
            </button>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Cadet
            </button>
          </div>
        ) : null}
      />

      {loading ? <Loading message="Loading annual medical list…" /> : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard icon={ClipboardList} iconBg="bg-primary-50 text-primary-900 border border-primary-100" value={stats.total} label="Total Cadets" />
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-600" value={stats.recorded} label="Measured" />
            <StatCard icon={Ruler} iconBg="bg-amber-100 text-amber-600" value={stats.pending} label="Pending" />
            <StatCard icon={CheckCircle2} iconBg="bg-secondary-100 text-primary-900 border border-secondary-200" value={`${stats.pct}%`} label="Completion" />
          </div>

          <div className="mb-5 rounded-xl border border-primary-100 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-primary-900">Checkup progress</p>
              <p className="text-sm text-slate-500">{stats.recorded} / {stats.total || stats.recorded} recorded</p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar"
              aria-valuenow={stats.pct} aria-valuemin="0" aria-valuemax="100">
              <div className="h-full rounded-full bg-secondary-500 transition-all duration-500" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-primary-100 bg-white">
            <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-primary-100">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name, kit no or house…"
                  className="input pl-9" aria-label="Search cadets" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input w-auto" aria-label="Filter by status">
                <option value="all">All cadets</option>
                <option value="pending">Pending</option>
                <option value="recorded">Recorded</option>
              </select>
            </div>

            {cadetsList.length === 0 ? (
              <EmptyState
                title="No cadets yet"
                message="Add cadets to begin the annual height & weight checkup."
                icon={Ruler}
                action={canEdit && role !== 'admin' ? (
                  <button className="btn-primary btn-sm mt-3" onClick={() => setShowAdd(true)}>
                    <Plus size={15} /> Add Cadet
                  </button>
                ) : null}
              />
            ) : filtered.length === 0 ? (
              <SearchEmpty query={search || statusFilter} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table" aria-label="Annual height and weight measurements">
                    <thead>
                      <tr>
                        <th scope="col">Cadet</th>
                        <th scope="col">House</th>
                        <th scope="col">Height (cm)</th>
                        <th scope="col">Weight (kg)</th>
                        <th scope="col">BMI</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(c => {
                        const rec = recordMap[c.id];
                        const draft = drafts[c.id] || { height: '', weight: '' };
                        const h = Number(draft.height);
                        const w = Number(draft.weight);
                        const bmi = h >= 50 && w >= 20 ? Math.round((w / ((h / 100) ** 2)) * 10) / 10 : null;
                        const info = bmiInfo(bmi);
                        return (
                          <tr key={c.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <Avatar name={c.name} size="sm" />
                                <div>
                                  <p className="font-medium text-slate-800">{c.name}</p>
                                  <p className="text-xs text-slate-500">{c.kitNumber || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-sm text-slate-600">{c.houseName}</td>
                            <td>
                              <input type="number" inputMode="decimal" min="50" max="250" step="0.1"
                                value={draft.height} disabled={!canEdit}
                                onChange={(e) => setDraft(c.id, 'height', e.target.value)}
                                className="input w-24" aria-label={`Height for ${c.name}`} placeholder="—" />
                            </td>
                            <td>
                              <input type="number" inputMode="decimal" min="20" max="200" step="0.1"
                                value={draft.weight} disabled={!canEdit}
                                onChange={(e) => setDraft(c.id, 'weight', e.target.value)}
                                className="input w-24" aria-label={`Weight for ${c.name}`} placeholder="—" />
                            </td>
                            <td>
                              {bmi != null ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-800">{bmi}</span>
                                  {info && <Badge variant={info.variant}>{info.label}</Badge>}
                                </div>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td>
                              {rec ? (
                                <div>
                                  <Badge variant="success">Recorded</Badge>
                                  <p className="text-xs text-slate-500 mt-1">{formatDate(rec.measuredAt)}</p>
                                </div>
                              ) : (
                                <Badge variant="warning">Pending</Badge>
                              )}
                            </td>
                            <td className="text-right">
                              {canEdit && (
                                <button className="btn-primary btn-sm" disabled={savingId === c.id}
                                  onClick={() => handleSave(c)}>
                                  {savingId === c.id ? 'Saving…' : rec ? 'Update' : 'Save'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                      className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="flex items-center px-2 text-sm text-slate-600">
                      Page {safePage} of {totalPages}
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                      className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <Modal open={showClear} onClose={() => setShowClear(false)} title="Clear All Data — New Year" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Start fresh for a newly added batch of cadets. This permanently deletes the selected data.
          </p>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input type="checkbox" className="mt-0.5" checked={clearOpts.measurements}
              onChange={(e) => setClearOpts(o => ({ ...o, measurements: e.target.checked }))} />
            <span>
              <span className="block text-sm font-medium text-slate-800">Clear all measurements</span>
              <span className="block text-xs text-slate-500">Height, weight & BMI records ({records.length})</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input type="checkbox" className="mt-0.5" checked={clearOpts.cadets}
              onChange={(e) => setClearOpts(o => ({ ...o, cadets: e.target.checked }))} />
            <span>
              <span className="block text-sm font-medium text-slate-800">Clear cadets added in this portal</span>
              <span className="block text-xs text-slate-500">Roll list entered here only ({portalCadets.length})</span>
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button className="btn-secondary" onClick={() => setShowClear(false)} disabled={clearing}>Cancel</button>
            <button className="btn-danger" onClick={handleClear} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear Data'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Cadet to Annual Medical">
        <form onSubmit={handleAdd} className="space-y-4">
          <FormField label="Kit Number" id="am-kit" hint="3–6 digits — auto-fills name & house">
            <Input id="am-kit" value={addForm.kitNumber} inputMode="numeric"
              onChange={(e) => setAddForm(f => ({ ...f, kitNumber: e.target.value }))}
              placeholder="e.g. 5701" autoFocus />
          </FormField>
          <FormField label="Cadet Name" required error={addErrors.name} id="am-name">
            <Input id="am-name" value={addForm.name}
              onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ali Khan" error={addErrors.name} />
          </FormField>
          <FormField label="House" id="am-house" hint="Optional — auto-fills from kit">
            <Input id="am-house" value={addForm.houseName} list="am-houses"
              onChange={(e) => setAddForm(f => ({ ...f, houseName: e.target.value }))}
              placeholder="e.g. Jinnah House" />
            <datalist id="am-houses">
              {houses.map(h => <option key={h.id} value={h.name} />)}
            </datalist>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Add Cadet</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
