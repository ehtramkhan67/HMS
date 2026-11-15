import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, BedDouble, Pill, FlaskConical, ArrowRight,
  Activity, Clock, FileText,
} from 'lucide-react';
import { PageHeader, StatCard, Card, CardHeader, CardBody, Avatar } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { canAccess } from '../utils/rbac';
import { timeAgo } from '../utils/helpers';
import { useSyncRefresh } from '../utils/sync';
import { houses, recordHouse } from '../data/cadets';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Tooltip shared by both house charts: hides zero series so the
// stacked counts stay readable month to month / week to week.
function HouseTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload.filter(p => (p.value || 0) > 0);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
      <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</p>
      {rows.length === 0 && <p style={{ color: '#94a3b8' }}>No records</p>}
      {rows.map(p => (
        <p key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: p.color || '#ccc', display: 'inline-block' }} />
          {p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, role, roleData } = useAuth();
  const showLab = canAccess(role, 'lab');
  const showQueue = canAccess(role, 'queue');
  // House Masters get their own house's numbers only.
  const houseScope = role === 'houseMaster' ? (user?.houseName || '') : '';
  const chartHouses = houseScope ? houses.filter(h => h.name === houseScope) : houses;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [illnessData, setIllnessData] = useState([]);
  const [opdData, setOpdData] = useState([]);

  // Weekly stacked bars: houses in palette order; visits with no
  // mappable house are flagged Unmapped (house rule) as a pale-grey
  // segment, kept lighter than Junior House's grey to stay distinct.
  const hasUnmapped = opdData.some(r => (r.Unmapped || 0) > 0);
  const barHouses = hasUnmapped
    ? [...chartHouses, { id: 'unmapped', name: 'Unmapped', color: '#cbd5e1' }]
    : chartHouses;

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLab, showQueue, houseScope]);
  // Live sync: re-render with fresh numbers when another device changes data.
  useSyncRefresh(loadDashboard);

  async function loadDashboard(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [lowStock, admitted, pendingLabs, queue, acts, illness, opd, slips] = await Promise.all([
        api.getLowStock(),
        api.getAdmitted(),
        showLab ? api.getPendingLabOrders() : Promise.resolve([]),
        showQueue ? api.getQueue() : Promise.resolve([]),
        api.getActivities(8),
        api.getIllnessTrendsByHouse(),
        api.getWeeklyOPDVisits(),
        api.getRestDutySlips(),
      ]);
      const today = new Date().toISOString().split('T')[0];
      // House-scoped via recordHouse (normalises mixed forms like
      // "Ayub" vs "Ayub House" and falls back to the cadet directory).
      const adm = houseScope ? admitted.filter(a => recordHouse(a) === houseScope) : admitted;
      const houseSlips = houseScope ? slips.filter(s => recordHouse(s) === houseScope) : slips;
      setStats({
        sickReports: houseSlips.filter(s => s.issueDate === today).length,
        admitted: adm.length,
        lowStock: lowStock.length,
        pendingLabs: pendingLabs.length,
        activeSlips: houseSlips.filter(s => s.status === 'Active').length,
      });
      setQueueData(queue.filter(q => q.status !== 'Done'));
      setActivities(acts);
      setIllnessData(houseScope
        ? illness.map(r => ({ month: r.month, [houseScope]: r[houseScope] ?? 0 }))
        : illness);
      setOpdData(opd);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Admin / House Master portal headers show plain titles (no person names).
  const welcomeName = role === 'admin' ? 'Admin'
    : role === 'houseMaster' ? (user?.houseName ? `House Master — ${user.houseName}` : 'House Master')
    : (user?.name || 'User');

  if (loading) return <Loading message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${welcomeName}`}
        subtitle={`${roleData?.name || ''} — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* Summary stat cards */}
      <div className={
        showLab && showQueue ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6'
        : showLab || showQueue ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6'
        : 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'
      }>
        {showQueue && (
          <StatCard
            icon={ClipboardList}
            iconBg="bg-primary-50 text-primary-900 border border-primary-100"
            value={stats.sickReports}
            label="Today's Sick Reports"
          />
        )}
        <StatCard
          icon={BedDouble}
          iconBg="bg-red-50 text-red-600"
          value={stats.admitted}
          label={houseScope ? `Admitted (${houseScope})` : 'Admitted Cadets'}
        />
        {role === 'houseMaster' && (
          <StatCard
            icon={FileText}
            iconBg="bg-blue-50 text-blue-600"
            value={stats.activeSlips}
            label="Active Duty Slips"
            trend={{ positive: true, value: houseScope ? `${houseScope} only` : 'Own house only' }}
          />
        )}
        {role !== 'houseMaster' && (
          <StatCard
            icon={Pill}
            iconBg="bg-amber-50 text-amber-600"
            value={stats.lowStock}
            label="Low-Stock Medicines"
            trend={{ positive: false, value: 'Requires restocking' }}
          />
        )}
        {showLab && (
          <StatCard
            icon={FlaskConical}
            iconBg="bg-emerald-50 text-emerald-600"
            value={stats.pendingLabs}
            label="Pending Lab Results"
          />
        )}
      </div>

      <div className={`gap-6 mb-6 ${showQueue ? 'grid grid-cols-1 xl:grid-cols-3' : ''}`}>
        {/* Queue widget */}
        {showQueue && (
          <Card className="xl:col-span-1">
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary-900">OPD Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">{queueData.filter(q => q.status === 'Waiting').length} waiting</p>
              </div>
              <Link to="/queue" className="text-secondary-600 text-xs font-semibold hover:text-primary-900 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {queueData.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Queue is empty.</div>
              ) : (
                <div className="divide-y divide-primary-50">
                  {queueData.slice(0, 6).map(q => (
                    <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        q.status === 'In Consultation' ? 'bg-secondary-500 text-primary-900' : 'bg-primary-900 text-white'
                      }`}>
                        #{q.token}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{q.cadetName}</p>
                        <p className="text-xs text-slate-500 truncate">{q.complaint}</p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Recent activity */}
        <Card className={showQueue ? 'xl:col-span-2' : ''}>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-dark-900">Recent Activity</h3>
            <Activity size={16} className="text-slate-400" />
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {activities.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">No recent activity yet — actions you take will appear here.</div>
              )}
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={a.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{a.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.user} · <span className="inline-flex items-center gap-1"><Clock size={10} /> {timeAgo(a.timestamp)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-dark-900">Illness Trends{houseScope ? ` — ${houseScope}` : ' by House'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly sick reports{houseScope ? '' : ' per house'} (last 8 months)</p>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={illnessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip content={<HouseTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chartHouses.map((house) => (
                    <Line
                      key={house.id}
                      type="monotone"
                      dataKey={house.name}
                      stroke={house.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {role !== 'houseMaster' && (
        <Card>
          <CardHeader>
            <h3 className="font-bold text-primary-900">Weekly OPD Visits</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visits per week, stacked by house</p>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opdData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCE3F3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip content={<HouseTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {barHouses.map(h => (
                    <Bar
                      key={h.id}
                      dataKey={h.name}
                      stackId="visits"
                      fill={h.color}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        )}
      </div>
    </div>
  );
}
