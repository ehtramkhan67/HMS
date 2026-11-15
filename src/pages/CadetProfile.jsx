import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Droplets, Calendar, Phone, Mail, MapPin,
  Syringe, ClipboardList, AlertTriangle, Heart, Shield, Home,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Avatar } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, EmptyState } from '../components/States';
import { api } from '../utils/api';
import { formatDate } from '../utils/helpers';
import { isLimitedRole } from '../utils/rbac';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSyncRefresh } from '../utils/sync';
import DeleteButton from '../components/DeleteButton';

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'history', label: 'Medical History', icon: ClipboardList },
  { key: 'allergies', label: 'Allergies & Conditions', icon: AlertTriangle },
  { key: 'immunizations', label: 'Immunizations', icon: Syringe },
  { key: 'visits', label: 'Visits', icon: Heart },
  { key: 'guardian', label: 'Guardian Contacts', icon: Phone },
];

export default function CadetProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const toast = useToast();
  const [cadet, setCadet] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');

  const limited = isLimitedRole(role);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [c, v] = await Promise.all([
        api.getCadet(id),
        api.getVisitsByCadet(id),
      ]);
      if (!c) throw new Error('Cadet not found');
      setCadet(c);
      setVisits(v);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Live sync: re-render with fresh data when another device changes it.
  useSyncRefresh(load);

  const handleDeleteVisit = async (v) => {
    try {
      await api.deleteVisit(v.id);
      setVisits(prev => prev.filter(x => x.id !== v.id));
      toast.success('Visit record deleted permanently');
    } catch {
      toast.error('Failed to delete visit');
    }
  };

  if (loading) return <Loading message="Loading cadet profile…" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/cadets')} />;
  if (!cadet) return null;

  // House Master only sees limited tabs
  const visibleTabs = limited
    ? TABS.filter(t => ['overview', 'guardian'].includes(t.key))
    : TABS;

  return (
    <div>
      <button onClick={() => navigate('/cadets')} className="btn-ghost btn-sm mb-4 -ml-2">
        <ArrowLeft size={14} /> Back to Cadet Records
      </button>

      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={cadet.name} size="lg" className="w-16 h-16 text-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-dark-900">{cadet.name}</h1>
              <StatusBadge status={cadet.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-slate-500">
              {cadet.kitNumber && <span className="font-mono text-slate-600">{cadet.kitNumber}</span>}
              <span className="flex items-center gap-1.5">
                <Home size={14} style={{ color: cadet.houseColor }} /> {cadet.houseName}
              </span>
              <span>{cadet.className}</span>
              <span className="flex items-center gap-1"><Droplets size={14} /> {cadet.bloodGroup}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> Age {cadet.age}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-primary-100 mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max" role="tablist" aria-label="Cadet profile sections">
          {visibleTabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-secondary-500 text-primary-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-primary-900 hover:border-primary-100'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab cadet={cadet} limited={limited} />}
        {tab === 'history' && !limited && <HistoryTab cadet={cadet} visits={visits} />}
        {tab === 'allergies' && !limited && <AllergiesTab cadet={cadet} />}
        {tab === 'immunizations' && !limited && <ImmunizationsTab cadet={cadet} />}
        {tab === 'visits' && !limited && <VisitsTab visits={visits} cadetId={cadet.id} onDelete={handleDeleteVisit} />}
        {tab === 'guardian' && <GuardianTab cadet={cadet} />}
      </div>

      {limited && (
        <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
          <Shield size={14} />
          House Master view — medical details are restricted.
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      {Icon && <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

function OverviewTab({ cadet, limited }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><h3 className="font-semibold text-dark-900">Personal Information</h3></CardHeader>
        <CardBody>
          <InfoRow label="Full Name" value={cadet.name} icon={User} />
          <InfoRow label="Kit Number" value={cadet.kitNumber || '—'} />
          <InfoRow label="Date of Birth" value={formatDate(cadet.dateOfBirth)} icon={Calendar} />
          <InfoRow label="Age" value={cadet.age != null ? `${cadet.age} years` : '—'} />
          <InfoRow label="Blood Group" value={cadet.bloodGroup} icon={Droplets} />
          <InfoRow label="Admission Date" value={formatDate(cadet.admissionDate)} icon={Calendar} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold text-dark-900">Physical Measurements</h3></CardHeader>
        <CardBody>
          <InfoRow label="Height" value={cadet.height ? `${cadet.height} cm` : '—'} />
          <InfoRow label="Weight" value={cadet.weight ? `${cadet.weight} kg` : '—'} />
          <InfoRow label="BMI" value={cadet.height && cadet.weight ? (cadet.weight / Math.pow(cadet.height / 100, 2)).toFixed(1) : '—'} />
          {!limited && <InfoRow label="House" value={cadet.houseName} icon={Home} />}
          <InfoRow label="Class" value={cadet.className} />
          <InfoRow label="Status" value={cadet.status} />
        </CardBody>
      </Card>
    </div>
  );
}

function HistoryTab({ visits }) {
  if (visits.length === 0) {
    return <EmptyState title="No medical history" message="This cadet has no recorded visits yet." />;
  }
  const sorted = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="space-y-4">
      {sorted.map(v => (
        <Card key={v.id}>
          <CardBody>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-medium text-slate-800">{v.diagnosis?.code && v.diagnosis.code !== '—' ? `${v.diagnosis.code} — ${v.diagnosis.name}` : (v.diagnosis?.name || '—')}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(v.date)} · {v.type} · {v.doctor}</p>
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div className="text-sm text-slate-600">
              <p><span className="font-medium">Symptoms:</span> {v.symptoms.join(', ')}</p>
              <p className="mt-1"><span className="font-medium">Advice:</span> {v.advice}</p>
              {v.prescription?.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Prescription:</p>
                  <ul className="list-disc list-inside text-slate-600">
                    {v.prescription.map((p, i) => (
                      <li key={i}>{p.medicine} — {p.dose}, {p.frequency}, {p.duration}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function AllergiesTab({ cadet }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><h3 className="font-semibold text-dark-900">Known Allergies</h3></CardHeader>
        <CardBody>
          {cadet.allergies.length === 0 ? (
            <p className="text-sm text-slate-500">No known allergies recorded.</p>
          ) : (
            <div className="space-y-2">
              {cadet.allergies.map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm font-medium">
                  <AlertTriangle size={14} /> {a}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader><h3 className="font-semibold text-dark-900">Chronic Conditions</h3></CardHeader>
        <CardBody>
          {cadet.chronicConditions.length === 0 ? (
            <p className="text-sm text-slate-500">No chronic conditions recorded.</p>
          ) : (
            <div className="space-y-2">
              {cadet.chronicConditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-3 py-2 text-sm font-medium">
                  <Heart size={14} /> {c}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ImmunizationsTab({ cadet }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-dark-900">Immunization Record</h3>
        <p className="text-xs text-slate-500 mt-0.5">Complete vaccination history</p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vaccine</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Given</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {cadet.immunizations.map((imm, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-3 text-slate-700 font-medium flex items-center gap-2">
                    <Syringe size={14} className="text-slate-400" /> {imm.name}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(imm.date)}</td>
                  <td className="px-5 py-3"><StatusBadge status={imm.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function VisitsTab({ visits, onDelete }) {
  if (visits.length === 0) {
    return <EmptyState title="No visits recorded" message="This cadet has not visited the hospital yet." />;
  }
  return (
    <Card>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Diagnosis</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...visits].sort((a, b) => new Date(b.date) - new Date(a.date)).map(v => (
                <tr key={v.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{formatDate(v.date)}</td>
                  <td className="px-5 py-3 text-slate-600">{v.type}</td>
                  <td className="px-5 py-3 text-slate-700">{v.diagnosis?.code && v.diagnosis.code !== '—' ? `${v.diagnosis.code} — ${v.diagnosis.name}` : (v.diagnosis?.name || '—')}</td>
                  <td className="px-5 py-3 text-slate-600">{v.doctor}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {onDelete && (
                      <DeleteButton onConfirm={() => onDelete(v)} label="Delete this visit permanently" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function GuardianTab({ cadet }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-dark-900">Primary Guardian</h3>
        </CardHeader>
        <CardBody>
          <InfoRow label="Name" value={cadet.guardian.name} icon={User} />
          <InfoRow label="Relation" value={cadet.guardian.relation} />
          <InfoRow label="Phone" value={cadet.guardian.phone} icon={Phone} />
          <InfoRow label="Email" value={cadet.guardian.email} icon={Mail} />
          <InfoRow label="Address" value={cadet.guardian.address} icon={MapPin} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-dark-900">Emergency Contact</h3>
        </CardHeader>
        <CardBody>
          <InfoRow label="Name" value={cadet.emergencyContact.name} icon={User} />
          <InfoRow label="Relation" value={cadet.emergencyContact.relation} />
          <InfoRow label="Phone" value={cadet.emergencyContact.phone} icon={Phone} />
        </CardBody>
      </Card>
    </div>
  );
}
