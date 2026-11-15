import { useState, useEffect } from 'react';
import {
  BedDouble, Plus, LogOut, ClipboardList, Pill, Stethoscope,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody, Badge, StatCard, Avatar } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, EmptyState } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Input, Textarea } from '../components/FormFields';
import { Alert } from '../components/Toast';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { validateForm, formatDate } from '../utils/helpers';
import { useKitAutofill } from '../utils/useKitAutofill';
import { useSyncRefresh } from '../utils/sync';
import DeleteButton from '../components/DeleteButton';

export default function WardBeds() {
  const toast = useToast();
  const { role, user } = useAuth();
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [bedStats, setBedStats] = useState(null);
  const [admissionsList, setAdmissionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWard, setSelectedWard] = useState('all');
  const [showAdmit, setShowAdmit] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [showNursing, setShowNursing] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [admitForm, setAdmitForm] = useState({ kitNumber: '', cadetId: '', houseName: '', diagnosis: '', bedId: '', consultant: '' });
  const [dischargeForm, setDischargeForm] = useState({ diagnosis: '', medicines: '', followUp: '' });
  const [errors, setErrors] = useState({});
  const [nursingNote, setNursingNote] = useState('');

  // Kit → cadet name + house autofill (same flow as Consultation).
  useKitAutofill(admitForm, setAdmitForm, { nameKey: 'cadetId', houseKey: 'houseName' });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [w, b, stats, adm] = await Promise.all([
        api.getWards(), api.getBeds(), api.getBedStats(), api.getAdmissions(),
      ]);
      setWards(w);
      setBeds(b);
      setBedStats(stats);
      setAdmissionsList(adm);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      const [b, stats, adm] = await Promise.all([
        api.getBeds(), api.getBedStats(), api.getAdmissions(),
      ]);
      setBeds(b);
      setBedStats(stats);
      setAdmissionsList(adm);
    } catch { /* keep current view on refresh failure */ }
  };

  useEffect(() => { load(); }, []);
  // Live sync: re-render with fresh data when another device changes it.
  useSyncRefresh(load);

  const handleDeleteAdmission = async (a) => {
    try {
      await api.deleteAdmission(a.id);
      await refresh();
      toast.success(`Admission record for ${a.cadetName} deleted permanently`);
    } catch {
      toast.error('Failed to delete admission');
    }
  };

  const activeAdmission = admissionsList.find(
    a => a.status === 'Admitted' && selectedBed && a.bedId === selectedBed.id
  ) || null;

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    if (bed.status === 'available') {
      setAdmitForm(f => ({ ...f, bedId: bed.number }));
      setErrors({});
      setShowAdmit(true);
    } else if (bed.status === 'occupied') {
      setShowNursing(true);
    }
  };

  const handleAdmit = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      cadetId: [{ type: 'required', message: 'Enter a cadet' }],
      diagnosis: [{ type: 'required', message: 'Diagnosis is required' }, { type: 'min', value: 5, message: 'Provide a clear diagnosis (min 5 chars)' }],
      consultant: [{ type: 'required', message: 'Enter consultant' }],
      bedId: [{ type: 'required', message: 'Enter a bed number' }],
    }, admitForm);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await api.admitCadet(admitForm);
      setShowAdmit(false);
      setAdmitForm({ kitNumber: '', cadetId: '', houseName: '', diagnosis: '', bedId: '', consultant: '' });
      await refresh();
      toast.success('Cadet admitted successfully');
    } catch (err) {
      toast.error(err?.message || 'Admission failed');
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    const errs = validateForm({
      diagnosis: [{ type: 'required', message: 'Final diagnosis is required' }],
    }, dischargeForm);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      if (selectedBed) {
        await api.dischargeCadet(selectedBed.id);
        setSelectedBed(null);
        await refresh();
      }
      setShowDischarge(false);
      toast.success('Cadet discharged successfully');
    } catch {
      toast.error('Discharge failed');
    }
  };

  const addNursingNote = async () => {
    if (!nursingNote.trim()) {
      toast.warning('Enter a nursing note first');
      return;
    }
    if (!activeAdmission) {
      toast.error('No active admission selected');
      return;
    }
    try {
      await api.addNursingNote(activeAdmission.id, nursingNote.trim(), user?.name);
      setNursingNote('');
      await refresh();
      toast.success('Nursing note added');
    } catch {
      toast.error('Failed to save nursing note');
    }
  };

  if (loading) return <Loading message="Loading ward data…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Ward & Beds"
        subtitle="Bed management, admissions, discharges, and nursing notes"
        actions={
          role !== 'admin' ? (
            <button onClick={() => { setSelectedBed(null); setErrors({}); setShowAdmit(true); }} className="btn-primary btn-sm">
              <Plus size={14} /> Admit Cadet
            </button>
          ) : null
        }
      />

      {/* Stats */}
      {bedStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <StatCard icon={BedDouble} iconBg="bg-primary-50 text-primary-900 border border-primary-100" value={bedStats.total} label="Total Beds" />
          <StatCard icon={BedDouble} iconBg="bg-emerald-50 text-emerald-600" value={bedStats.available} label="Available" />
          <StatCard icon={BedDouble} iconBg="bg-red-50 text-red-600" value={bedStats.occupied} label="Occupied" />
          <StatCard icon={BedDouble} iconBg="bg-amber-50 text-amber-600" value={bedStats.reserved} label="Reserved" />
          <StatCard icon={BedDouble} iconBg="bg-secondary-100 text-primary-900 border border-secondary-200" value={`${bedStats.occupancyRate}%`} label="Occupancy Rate" />
        </div>
      )}

      {/* Ward filter */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} className="input w-auto" aria-label="Filter by ward">
          <option value="all">All Wards</option>
          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="flex items-center gap-4 text-xs text-slate-500 ml-auto">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 border border-red-400" /> Occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" /> Reserved</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400" /> Maintenance</span>
        </div>
      </div>

      {/* Bed grid grouped by ward */}
      <div className="space-y-6">
        {wards.filter(w => selectedWard === 'all' || w.id === selectedWard).map(ward => {
          const wardBeds = beds.filter(b => b.wardId === ward.id);
          return (
            <Card key={ward.id}>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-dark-900">{ward.name}</h3>
                  <p className="text-xs text-slate-500">{ward.floor} · {wardBeds.length} beds</p>
                </div>
                <span className="text-xs text-slate-500">
                  {wardBeds.filter(b => b.status === 'available').length} available
                </span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {wardBeds.map(bed => (
                    <button
                      key={bed.id}
                      onClick={() => handleBedClick(bed)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all hover:scale-105 ${
                        bed.status === 'available' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' :
                        bed.status === 'occupied' ? 'bg-red-50 border-red-300 text-red-700' :
                        bed.status === 'reserved' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                        'bg-slate-100 border-slate-300 text-slate-400 line-through'
                      }`}
                      title={`${bed.number} — ${bed.status}`}
                      aria-label={`Bed ${bed.number}, status ${bed.status}`}
                    >
                      {bed.number.split('-')[1]}
                      <span className="text-[9px] font-normal">{bed.status.charAt(0).toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Current admissions */}
      <Card className="mt-6">
        <CardHeader>
          <h3 className="font-semibold text-dark-900 flex items-center gap-2"><ClipboardList size={16} /> Current Admissions</h3>
        </CardHeader>
        <CardBody className="p-0">
          {admissionsList.filter(a => a.status === 'Admitted').length === 0 ? (
            <EmptyState title="No active admissions" message="No cadets are currently admitted." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cadet</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ward / Bed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Admitted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Diagnosis</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admissionsList.filter(a => a.status === 'Admitted').map(a => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={a.cadetName} size="sm" />
                          <div>
                            <p className="font-medium text-slate-800">{a.cadetName}</p>
                            <p className="text-xs text-slate-500">{a.kitNumber || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.ward} / {a.bedNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(a.admitDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{a.diagnosis}</td>
                      <td className="px-4 py-3 text-slate-600">{a.consultant}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {role === 'doctor' ? (
                            <button
                              onClick={() => { setSelectedBed({ id: a.bedId, number: a.bedNumber, status: 'occupied' }); setErrors({}); setShowDischarge(true); }}
                              className="btn-secondary btn-sm"
                            >
                              <LogOut size={14} /> Discharge
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          <DeleteButton onConfirm={() => handleDeleteAdmission(a)} label="Delete this admission permanently" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Admit modal */}
      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit Cadet"
        footer={<>
          <button onClick={() => setShowAdmit(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAdmit} className="btn-primary"><Plus size={14} /> Admit</button>
        </>}>
        <form onSubmit={handleAdmit} className="space-y-4">
          <FormField label="Kit Number" id="admit-kit" hint="3–6 digits — auto-fills cadet & house">
            <Input id="admit-kit" value={admitForm.kitNumber} inputMode="numeric"
              onChange={(e) => setAdmitForm(f => ({ ...f, kitNumber: e.target.value }))}
              placeholder="e.g. 5701" />
          </FormField>
          <FormField label="Cadet" required error={errors.cadetId} id="admit-cadet" hint="Type cadet name or kit number">
            <Input id="admit-cadet" value={admitForm.cadetId}
              onChange={(e) => setAdmitForm(f => ({ ...f, cadetId: e.target.value }))}
              placeholder="e.g. Ali Khan or 5701" error={errors.cadetId} />
          </FormField>
          <FormField label="House" id="admit-house" hint="Cadet's house — auto-fills from kit">
            <Input id="admit-house" value={admitForm.houseName}
              onChange={(e) => setAdmitForm(f => ({ ...f, houseName: e.target.value }))}
              placeholder="e.g. Jinnah House" />
          </FormField>
          <FormField label="Diagnosis" required error={errors.diagnosis} id="admit-dx">
            <Input id="admit-dx" value={admitForm.diagnosis}
              onChange={(e) => setAdmitForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="e.g. Acute gastroenteritis with dehydration" error={errors.diagnosis} />
          </FormField>
          <FormField label="Consultant" required error={errors.consultant} id="admit-doc" hint="Type consultant name">
            <Input id="admit-doc" value={admitForm.consultant}
              onChange={(e) => setAdmitForm(f => ({ ...f, consultant: e.target.value }))}
              placeholder="e.g. Dr. Ahmed Raza" error={errors.consultant} />
          </FormField>
          <FormField label="Bed" required error={errors.bedId} id="admit-bed" hint="Type an available bed number">
            <Input id="admit-bed" value={admitForm.bedId}
              onChange={(e) => setAdmitForm(f => ({ ...f, bedId: e.target.value }))}
              placeholder="e.g. W-01" error={errors.bedId} />
          </FormField>
        </form>
      </Modal>

      {/* Discharge modal */}
      <Modal open={showDischarge} onClose={() => setShowDischarge(false)} title="Discharge Cadet"
        footer={<>
          <button onClick={() => setShowDischarge(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleDischarge} className="btn-primary"><LogOut size={14} /> Discharge</button>
        </>}>
        <form onSubmit={handleDischarge} className="space-y-4">
          <Alert type="info">Discharging patient. Enter final diagnosis and discharge medications.</Alert>
          <FormField label="Final Diagnosis" required error={errors.diagnosis} id="dis-dx">
            <Input id="dis-dx" value={dischargeForm.diagnosis}
              onChange={(e) => setDischargeForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="Final diagnosis at discharge" error={errors.diagnosis} />
          </FormField>
          <FormField label="Discharge Medicines" id="dis-med" hint="Separate multiple medicines with commas">
            <Textarea id="dis-med" value={dischargeForm.medicines}
              onChange={(e) => setDischargeForm(f => ({ ...f, medicines: e.target.value }))}
              placeholder="e.g. Paracetamol 500mg TDS × 3 days, ORS as needed" rows={3} />
          </FormField>
          <FormField label="Follow-up Date" id="dis-fu">
            <Input id="dis-fu" type="date" value={dischargeForm.followUp}
              onChange={(e) => setDischargeForm(f => ({ ...f, followUp: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      {/* Nursing notes / medication chart modal */}
      <Modal open={showNursing} onClose={() => setShowNursing(false)} title={`Ward Notes — Bed ${selectedBed?.number || ''}`}
        footer={<button onClick={() => setShowNursing(false)} className="btn-secondary">Close</button>}>
        <div className="space-y-5">
          {/* Active admission info */}
          {activeAdmission && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Avatar name={activeAdmission.cadetName} />
                <div>
                  <p className="font-medium text-slate-800">{activeAdmission.cadetName}</p>
                  <p className="text-xs text-slate-500">{activeAdmission.kitNumber || '—'} · {activeAdmission.ward}</p>
                </div>
                <StatusBadge status={activeAdmission.status} className="ml-auto" />
              </div>
              <p className="text-sm text-slate-600 mt-3"><span className="font-medium">Dx:</span> {activeAdmission.diagnosis}</p>
            </div>
          )}

          {/* Nursing notes */}
          <div>
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><Stethoscope size={16} /> Nursing Notes</h4>
            <div className="space-y-2 mb-3">
              {(activeAdmission?.nursingNotes || []).map((n, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{n.time}</span><span>{n.by}</span>
                  </div>
                  <p className="text-slate-700">{n.note}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={nursingNote}
                onChange={(e) => setNursingNote(e.target.value)}
                placeholder="Add a nursing note…"
                aria-label="Nursing note"
              />
              <button onClick={addNursingNote} className="btn-primary btn-sm shrink-0">Add</button>
            </div>
          </div>

          {/* Medication chart */}
          <div>
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><Pill size={16} /> Medication Chart</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Time</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Medicine</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Dose</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Given</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">By</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeAdmission?.medicationChart || []).map((m, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-600">{m.time}</td>
                      <td className="px-3 py-2 text-slate-700">{m.medicine}</td>
                      <td className="px-3 py-2 text-slate-600">{m.dose}</td>
                      <td className="px-3 py-2">
                        {m.given ? <Badge variant="success">Given</Badge> : <Badge variant="warning">Pending</Badge>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{m.by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
