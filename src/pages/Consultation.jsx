import { useState } from 'react';
import { Plus, Trash2, Printer, Save, ArrowRight, Check, Loader2 } from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody } from '../components/UI';
import { EmptyState } from '../components/States';
import { FormField, Input, Textarea } from '../components/FormFields';
import { SignatureLine } from '../components/PrintWrapper';
import { Alert } from '../components/Toast';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { cadets } from '../data/cadets';
import { medicines } from '../data/medicines';
import { isLimitedRole } from '../utils/rbac';
import { lookupCadetByKit } from '../utils/cadetDirectory';

export default function Consultation() {
  const { user, role } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [kitNumber, setKitNumber] = useState('');
  const [houseName, setHouseName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [kitConfirming, setKitConfirming] = useState(false);

  // Kit → arrow button: loads name + house from the cadet directory,
  // then locks both fields. Editing the kit number unlocks & clears them.
  const handleKitChange = (e) => {
    setKitNumber(e.target.value);
    if (locked) {
      setLocked(false);
      setPatientName('');
      setHouseName('');
    }
  };

  const handleKitConfirm = async () => {
    const kit = kitNumber.trim();
    if (!/^\d{3,6}$/.test(kit)) {
      toast.error('Enter a valid kit number (3–6 digits) first');
      return;
    }
    setKitConfirming(true);
    try {
      const hit = await lookupCadetByKit(kit);
      if (!hit) {
        toast.error(`No active cadet found for kit ${kit}`);
        return;
      }
      setPatientName(hit.name);
      setHouseName(hit.house || '');
      setLocked(true);
      toast.success(`${hit.name} — details loaded & locked`);
    } catch {
      toast.error('Lookup failed. Please try again.');
    } finally {
      setKitConfirming(false);
    }
  };

  const limited = isLimitedRole(role);

  const findCadet = (text) => {
    const q = (text || '').trim().toLowerCase();
    if (!q) return null;
    return cadets.find(c =>
      c.name.toLowerCase() === q ||
      c.collegeNumber.toLowerCase() === q ||
      (c.kitNumber && c.kitNumber.toLowerCase() === q)
    ) || cadets.find(c =>
      c.name.toLowerCase().includes(q) ||
      c.collegeNumber.toLowerCase().includes(q) ||
      (c.kitNumber && c.kitNumber.toLowerCase().includes(q))
    ) || null;
  };

  const findMedicine = (text) => {
    const q = (text || '').trim().toLowerCase();
    if (!q) return null;
    return medicines.find(m => m.name.toLowerCase() === q || m.genericName.toLowerCase() === q)
      || medicines.find(m => m.name.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q))
      || null;
  };

  const addPrescription = () => {
    setPrescriptions(prev => [...prev, {
      id: Date.now(),
      medicine: '',
      dose: '',
      frequency: '',
      duration: '',
    }]);
  };

  const updatePrescription = (id, field, value) => {
    setPrescriptions(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removePrescription = (id) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };

  const validate = () => {
    const errs = {};
    if (!patientName.trim()) errs.patientName = 'Patient name is required';
    if (!symptoms.trim()) errs.symptoms = 'Symptoms are required';
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';

    prescriptions.forEach((p, i) => {
      if (!p.medicine.trim()) errs[`med_${i}`] = 'Medicine name is required';
      if (!p.dose.trim()) errs[`dose_${i}`] = 'Dose is required';
      if (!p.frequency.trim()) errs[`freq_${i}`] = 'Frequency is required';
      if (!p.duration.trim()) errs[`dur_${i}`] = 'Duration is required';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    setLoading(true);
    try {
      const existing = findCadet(patientName);
      const cadet = await api.registerCadet({
        name: patientName.trim(),
        kitNumber: kitNumber.trim(),
        houseName: houseName.trim(),
      });
      const rxItems = prescriptions.map(p => {
        const med = findMedicine(p.medicine);
        return {
          medicineId: med ? med.id : null,
          medicine: p.medicine.trim(),
          dose: p.dose.trim(),
          frequency: p.frequency.trim(),
          duration: p.duration.trim(),
        };
      });
      await api.createVisit({
        cadetId: cadet ? cadet.id : null,
        patientName: patientName.trim(),
        kitNumber: kitNumber.trim() || (cadet ? cadet.kitNumber : ''),
        houseName: houseName.trim() || (cadet ? cadet.houseName : ''),
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        diagnosis: diagnosis.trim(),
        advice,
        prescription: rxItems,
        doctor: user?.name || 'SMO',
        source: 'Consultation',
      });
      if (rxItems.length > 0) {
        const patient = cadet || {
          id: 'walk-in',
          name: patientName.trim(),
          collegeNumber: '—',
          kitNumber: kitNumber.trim() || '—',
          houseName: '—',
          className: '—',
        };
        const rx = await api.createPrescriptionFromVisit({
          cadet: patient,
          diagnosis: diagnosis.trim(),
          symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
          advice,
          items: rxItems,
        doctor: user?.name || 'SMO',
        });
        toast.success(`Prescription ${rx.rxNumber} sent to Physician Portal`);
      }
      if (!existing && cadet) {
        toast.success(`New cadet "${cadet.name}" registered in Cadet Records`);
      }
      setSaved(true);
      toast.success('Consultation saved successfully');
    } catch {
      toast.error('Failed to save consultation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientName('');
    setKitNumber('');
    setHouseName('');
    setLocked(false);
    setSymptoms('');
    setDiagnosis('');
    setAdvice('');
    setPrescriptions([]);
    setErrors({});
    setSaved(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (limited) {
    return (
      <div>
        <PageHeader title="Consultation" />
        <EmptyState
          title="Access Restricted"
          message="House Master role does not have access to clinical consultation. Contact your administrator."
        />
      </div>
    );
  }

  const matchedCadet = findCadet(patientName);
  const displayKitNumber = kitNumber || (matchedCadet ? matchedCadet.kitNumber : '');

  return (
    <div>
      <PageHeader
        title="Consultation"
        subtitle="Record patient details, symptoms, diagnosis, and generate a prescription"
        actions={
          saved ? (
            <>
              <button onClick={resetForm} className="btn-secondary btn-sm">New Consultation</button>
              <button onClick={handlePrint} className="btn-primary btn-sm"><Printer size={14} /> Print Prescription</button>
            </>
          ) : (
            <>
              <button onClick={resetForm} className="btn-secondary btn-sm">Reset</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary btn-sm">
                {loading ? 'Saving…' : <><Save size={14} /> Save Consultation</>}
              </button>
            </>
          )
        }
      />

      {saved && (
        <div className="mb-6">
          <Alert type="success" title="Consultation saved">
            The consultation has been recorded. You can now print the prescription or start a new one.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: patient + symptoms + diagnosis + prescription */}
        <div className="xl:col-span-2 space-y-6">
          {/* Patient */}
          <Card>
            <CardHeader><h3 className="font-semibold text-dark-900">Patient</h3></CardHeader>
            <CardBody>
              <FormField label="Kit Number" id="con-kit" hint="Enter kit number, then click → to load & lock cadet details">
                <div className="flex items-stretch gap-2">
                  <Input
                    id="con-kit"
                    value={kitNumber}
                    onChange={handleKitChange}
                    placeholder="e.g. K-2041"
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleKitConfirm(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleKitConfirm}
                    disabled={kitConfirming || locked}
                    title={locked ? 'Details locked — edit the kit number to change' : 'Load cadet by kit number'}
                    aria-label="Load cadet by kit number"
                    className={`flex w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
                      locked
                        ? 'bg-emerald-600 text-white'
                        : 'bg-secondary-500 text-primary-950 hover:bg-secondary-400'
                    }`}
                  >
                    {kitConfirming
                      ? <Loader2 size={17} className="animate-spin" />
                      : locked
                        ? <Check size={17} strokeWidth={3} />
                        : <ArrowRight size={17} strokeWidth={2.5} />}
                  </button>
                </div>
              </FormField>
              <div className="mt-3">
                <FormField label="Patient" required error={errors.patientName} id="con-patient" hint="Type patient name or kit number">
                  <Input
                    id="con-patient"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ali Khan (C-1024) or kit number"
                    error={errors.patientName}
                    readOnly={locked}
                    aria-readonly={locked || undefined}
                    className={locked ? 'bg-slate-100 cursor-not-allowed text-slate-700' : ''}
                  />
                </FormField>
              </div>
              <div className="mt-3">
                <FormField label="House" id="con-house" hint="Cadet's house name">
                  <Input
                    id="con-house"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    placeholder="e.g. Jinnah House"
                    readOnly={locked}
                    aria-readonly={locked || undefined}
                    className={locked ? 'bg-slate-100 cursor-not-allowed text-slate-700' : ''}
                  />
                </FormField>
              </div>
              {matchedCadet && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="bg-slate-100 px-3 py-1 rounded-lg">{matchedCadet.className}</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-lg">Age {matchedCadet.age}</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-lg">{matchedCadet.bloodGroup}</span>
                  {matchedCadet.allergies.length > 0 && (
                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg font-medium">
                      ⚠ Allergies: {matchedCadet.allergies.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Symptoms */}
          <Card>
            <CardHeader><h3 className="font-semibold text-dark-900">Symptoms / History of Presenting Illness</h3></CardHeader>
            <CardBody>
              <FormField label="Symptoms" required error={errors.symptoms} id="con-symptoms" hint="Separate multiple symptoms with commas">
                <Textarea
                  id="con-symptoms"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Fever, cough, sore throat for 3 days"
                  rows={3}
                  error={errors.symptoms}
                />
              </FormField>
            </CardBody>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader><h3 className="font-semibold text-dark-900">Diagnosis</h3></CardHeader>
            <CardBody>
              <FormField label="Diagnosis" required error={errors.diagnosis} id="con-diagnosis">
                <Input
                  id="con-diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute upper respiratory infection"
                  error={errors.diagnosis}
                />
              </FormField>
              <div className="mt-4">
                <FormField label="Advice" id="con-advice">
                  <Textarea
                    id="con-advice"
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    placeholder="Rest, hydration, follow-up instructions…"
                    rows={3}
                  />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* Prescription Builder */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-dark-900">Prescription</h3>
              <button onClick={addPrescription} className="btn-secondary btn-sm">
                <Plus size={14} /> Add Medicine
              </button>
            </CardHeader>
            <CardBody className="space-y-4">
              {prescriptions.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No medicines added. Click "Add Medicine" to start a prescription.</p>
              )}
              {prescriptions.map((p, i) => (
                <div key={p.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Medicine {i + 1}</span>
                    <button
                      onClick={() => removePrescription(p.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label={`Remove medicine ${i + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField label="Medicine" required error={errors[`med_${i}`]} id={`med-${p.id}`}>
                      <Input
                        id={`med-${p.id}`}
                        value={p.medicine}
                        onChange={(e) => updatePrescription(p.id, 'medicine', e.target.value)}
                        placeholder="e.g. Paracetamol 500mg"
                        error={errors[`med_${i}`]}
                      />
                    </FormField>
                    <FormField label="Dose" required error={errors[`dose_${i}`]} id={`dose-${p.id}`}>
                      <Input
                        id={`dose-${p.id}`}
                        value={p.dose}
                        onChange={(e) => updatePrescription(p.id, 'dose', e.target.value)}
                        placeholder="e.g. 1 tablet, 5ml"
                        error={errors[`dose_${i}`]}
                      />
                    </FormField>
                    <FormField label="Frequency" required error={errors[`freq_${i}`]} id={`freq-${p.id}`}>
                      <Input
                        id={`freq-${p.id}`}
                        value={p.frequency}
                        onChange={(e) => updatePrescription(p.id, 'frequency', e.target.value)}
                        placeholder="e.g. TDS (three times daily)"
                        error={errors[`freq_${i}`]}
                      />
                    </FormField>
                    <FormField label="Duration" required error={errors[`dur_${i}`]} id={`dur-${p.id}`}>
                      <Input
                        id={`dur-${p.id}`}
                        value={p.duration}
                        onChange={(e) => updatePrescription(p.id, 'duration', e.target.value)}
                        placeholder="e.g. 5 days"
                        error={errors[`dur_${i}`]}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Right: printable prescription preview */}
        <div className="xl:col-span-1">
          <div className="sticky top-20">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="font-semibold text-dark-900">Prescription Preview</h3>
                <button onClick={handlePrint} className="btn-secondary btn-sm no-print">
                  <Printer size={14} /> Print
                </button>
              </CardHeader>
              <CardBody>
                <div id="prescription-print" className="text-sm">
                  <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                    <h4 className="font-bold text-base text-slate-900">CADET COLLEGE KOHAT</h4>
                    <p className="text-xs text-slate-500">Outpatient Prescription</p>
                  </div>

                  {patientName.trim() ? (
                    <div className="space-y-1 mb-4 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Patient:</span><span className="font-medium">{patientName.trim()}</span></div>
                      {displayKitNumber && (
                        <div className="flex justify-between"><span className="text-slate-500">Kit No:</span><span>{displayKitNumber}</span></div>
                      )}
                      {houseName.trim() && !matchedCadet && (
                        <div className="flex justify-between"><span className="text-slate-500">House:</span><span>{houseName.trim()}</span></div>
                      )}
                      {matchedCadet && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500">Kit No:</span><span>{matchedCadet.kitNumber || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">House / Class:</span><span>{houseName.trim() || matchedCadet.houseName} / {matchedCadet.className}</span></div>
                        </>
                      )}
                      <div className="flex justify-between"><span className="text-slate-500">Date:</span><span>{new Date().toLocaleDateString('en-GB')}</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">Enter patient name to preview</p>
                  )}

                  {diagnosis.trim() && (
                    <div className="mb-3 p-2 bg-primary-50 border border-primary-200 rounded-lg text-xs">
                      <span className="font-bold text-primary-900">Dx:</span>{' '}
                      <span className="text-slate-700">{diagnosis.trim()}</span>
                    </div>
                  )}

                  {prescriptions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-xs uppercase text-slate-500 border-b border-slate-200 pb-1">Rx</p>
                      {prescriptions.map((p, i) => (
                        <div key={p.id} className="text-xs flex gap-2">
                          <span className="font-medium text-slate-500">{i + 1}.</span>
                          <div>
                            <p className="font-medium text-slate-800">{p.medicine || '—'}</p>
                            <p className="text-slate-500">{p.dose} · {p.frequency} · {p.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">No medicines added</p>
                  )}

                  {advice && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                      <p className="font-semibold text-slate-500 uppercase mb-1">Advice</p>
                      <p className="text-slate-700">{advice}</p>
                    </div>
                  )}

                  <SignatureLine name={user?.name || 'Doctor'} role="Consultant" date={new Date().toLocaleDateString('en-GB')} />
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
