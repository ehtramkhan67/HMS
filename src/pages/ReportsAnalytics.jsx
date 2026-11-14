import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3, Download, Printer, RefreshCw, Users, BedDouble, Pill,
  FlaskConical, FileText, Ruler, AlertTriangle, ClipboardList, Calendar, X,
} from 'lucide-react';
import { PageHeader, StatCard, Card, CardHeader, CardBody } from '../components/UI';
import { Loading, ErrorState } from '../components/States';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { downloadMockFile, toCSV } from '../utils/helpers';
import { houses } from '../data/cadets';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#042938', '#00BCD5', '#10b981', '#f59e0b', '#D40035', '#8b5cf6', '#64748b'];

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => isoLocal(new Date());
const shiftDays = (isoStr, n) => {
  const d = new Date(`${isoStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};
const fmtDay = (isoStr) =>
  new Date(`${isoStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function ChartEmpty({ message = 'No data in the selected period' }) {
  return (
    <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
      <BarChart3 size={28} className="text-primary-300" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, rows, onExport, children }) {
  const hasData = rows && rows.length > 0;
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-primary-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {onExport && (
          <button onClick={onExport} disabled={!hasData}
            className="btn-ghost btn-sm no-print disabled:opacity-40" title="Export CSV">
            <Download size={14} />
          </button>
        )}
      </CardHeader>
      <CardBody>
        {hasData ? <div className="h-72">{children}</div> : <ChartEmpty />}
      </CardBody>
    </Card>
  );
}

const tooltipStyle = { borderRadius: 8, border: '1px solid #DCE3F3', fontSize: 13 };

export default function ReportsAnalytics() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [houseFilter, setHouseFilter] = useState('all');
  const [lastSync, setLastSync] = useState(null);
  const [raw, setRaw] = useState({
    visits: [], rx: [], admissions: [], beds: [], slips: [],
    labs: [], queue: [], measures: [], cadets: [], lowStock: [],
  });

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [visits, rx, admissions, beds, slips, labs, queue, measures, cadets, lowStock] = await Promise.all([
        api.getVisits(),
        api.getPrescriptions(),
        api.getAdmissions(),
        api.getBeds(),
        api.getRestDutySlips(),
        api.getLabOrders(),
        api.getQueue(),
        api.getAnnualMedical(),
        api.getCadets(),
        api.getLowStock(),
      ]);
      setRaw({ visits, rx, admissions, beds, slips, labs, queue, measures, cadets, lowStock });
      setLastSync(new Date());
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load(true);
    const timer = setInterval(() => load(true), 30000);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cadetMap = useMemo(() => {
    const m = {};
    raw.cadets.forEach(c => { m[c.id] = c; });
    return m;
  }, [raw.cadets]);

  const selectedHouseName = useMemo(
    () => (houseFilter === 'all' ? null : (houses.find(h => h.id === houseFilter)?.name || null)),
    [houseFilter]
  );

  const inRange = (iso) => {
    if (!applied.from && !applied.to) return true;
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (applied.from && d < applied.from) return false;
    if (applied.to && d > applied.to) return false;
    return true;
  };
  const byHouse = useCallback(
    (houseName) => !selectedHouseName || (houseName || '') === selectedHouseName,
    [selectedHouseName]
  );
  const houseOf = useCallback((cadetId) => cadetMap[cadetId]?.houseName || '', [cadetMap]);

  const fVisits = useMemo(
    () => raw.visits.filter(v => inRange(v.date) && byHouse(houseOf(v.cadetId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName, cadetMap]
  );
  const fRx = useMemo(
    () => raw.rx.filter(p => inRange(p.prescribedAt) && byHouse(p.houseName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName]
  );
  const fAdm = useMemo(
    () => raw.admissions.filter(a => inRange(a.admitDate) && byHouse(a.houseName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName]
  );
  const fSlips = useMemo(
    () => raw.slips.filter(s => inRange(s.issueDate) && byHouse(s.houseName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName]
  );
  const fLabs = useMemo(
    () => raw.labs.filter(l => inRange(l.orderDate) && byHouse(houseOf(l.cadetId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName, cadetMap]
  );
  const fMeasures = useMemo(
    () => raw.measures.filter(r => inRange(r.measuredAt) && byHouse(houseOf(r.cadetId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, applied, selectedHouseName, cadetMap]
  );
  const fQueue = useMemo(
    () => raw.queue.filter(q => byHouse(q.houseName)),
    [raw.queue, byHouse]
  );

  // ── Derived: visits per day (per house) ──
  const { visitsByDay, visitDaysTotal } = useMemo(() => {
    const countByDayHouse = {};
    fVisits.forEach(v => {
      const d = (v.date || '').slice(0, 10);
      const house = houseOf(v.cadetId) || 'Unknown';
      if (!countByDayHouse[d]) countByDayHouse[d] = { total: 0 };
      countByDayHouse[d][house] = (countByDayHouse[d][house] || 0) + 1;
      countByDayHouse[d].total += 1;
    });
    const days = [];
    const to = applied.to || todayIso();
    let cur = applied.from || shiftDays(to, -13);
    let guard = 0;
    while (cur <= to && guard < 90) {
      const counts = countByDayHouse[cur] || {};
      const row = { day: fmtDay(cur), total: counts.total || 0 };
      (selectedHouseName ? [selectedHouseName] : houses.map(h => h.name)).forEach(n => {
        row[n] = counts[n] || 0;
      });
      days.push(row);
      cur = shiftDays(cur, 1);
      guard++;
    }
    return { visitsByDay: days, visitDaysTotal: fVisits.length };
  }, [fVisits, applied, selectedHouseName, houseOf]);

  const houseLineKeys = selectedHouseName ? [selectedHouseName] : houses.map(h => h.name);

  // ── Derived: diagnosis distribution ──
  const diagnosisData = useMemo(() => {
    const counts = {};
    fVisits.forEach(v => {
      const name = v.diagnosis?.name;
      if (name && name !== '—') counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (sorted.length > 7) {
      const top = sorted.slice(0, 6);
      const rest = sorted.slice(6).reduce((s, r) => s + r.value, 0);
      return [...top, { name: 'Other', value: rest }];
    }
    return sorted;
  }, [fVisits]);

  // ── Derived: medicine consumption (dispensed, falls back to prescribed) ──
  const { consumptionData, consumptionLabel } = useMemo(() => {
    const dispensed = fRx.filter(p => p.status === 'Dispensed');
    const source = dispensed.length ? dispensed : fRx;
    const counts = {};
    source.forEach(p => (p.items || []).forEach(i => {
      if (i.medicine) counts[i.medicine] = (counts[i.medicine] || 0) + 1;
    }));
    const data = Object.entries(counts).map(([medicine, units]) => ({ medicine, units }))
      .sort((a, b) => b.units - a.units).slice(0, 8);
    return {
      consumptionData: data,
      consumptionLabel: dispensed.length
        ? 'Units dispensed via Physician Portal'
        : 'Units prescribed (nothing dispensed yet)',
    };
  }, [fRx]);

  // ── Derived: class-wise cases ──
  const classData = useMemo(() => {
    const counts = {};
    fVisits.forEach(v => {
      const cls = cadetMap[v.cadetId]?.className || 'Unknown';
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return Object.entries(counts).map(([className, cases]) => ({ className, cases }))
      .sort((a, b) => b.cases - a.cases);
  }, [fVisits, cadetMap]);

  // ── Derived: admissions vs discharges (last 6 months) ──
  const admissionsByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        Admitted: 0,
        Discharged: 0,
      });
    }
    const idx = {};
    months.forEach(m => { idx[m.key] = m; });
    fAdm.forEach(a => {
      const ak = (a.admitDate || '').slice(0, 7);
      if (idx[ak]) idx[ak].Admitted += 1;
      const dk = (a.dischargeDate || '').slice(0, 7);
      if (dk && idx[dk]) idx[dk].Discharged += 1;
    });
    return months;
  }, [fAdm]);

  // ── Derived: slips by type ──
  const slipTypeData = useMemo(() => {
    const counts = {};
    fSlips.forEach(s => { counts[s.type || 'Other'] = (counts[s.type || 'Other'] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [fSlips]);

  // ── Derived: lab orders by status ──
  const labStatusData = useMemo(() => {
    const counts = {};
    fLabs.forEach(l => { counts[l.status || 'Ordered'] = (counts[l.status || 'Ordered'] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [fLabs]);

  // ── Derived: BMI distribution (Annual Medical) ──
  const bmiData = useMemo(() => {
    const buckets = [
      { name: 'Underweight', range: '< 18.5', value: 0 },
      { name: 'Normal', range: '18.5 – 24.9', value: 0 },
      { name: 'Overweight', range: '25 – 29.9', value: 0 },
      { name: 'Obese', range: '≥ 30', value: 0 },
    ];
    fMeasures.forEach(r => {
      const b = r.bmi;
      if (b == null) return;
      if (b < 18.5) buckets[0].value += 1;
      else if (b < 25) buckets[1].value += 1;
      else if (b < 30) buckets[2].value += 1;
      else buckets[3].value += 1;
    });
    return buckets;
  }, [fMeasures]);
  const bmiHasData = fMeasures.length > 0;

  // ── KPIs ──
  const kpis = useMemo(() => {
    const occupied = raw.beds.filter(b => b.status === 'occupied').length;
    const totalBeds = raw.beds.length;
    const dispensed = fRx.filter(p => p.status === 'Dispensed').length;
    const medPct = raw.cadets.length
      ? Math.min(100, Math.round((fMeasures.length / raw.cadets.length) * 100))
      : 0;
    return {
      cadets: raw.cadets.length,
      visits: fVisits.length,
      rx: fRx.length,
      rxDispensed: dispensed,
      bedsOccupied: occupied,
      bedsTotal: totalBeds,
      bedPct: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
      labs: fLabs.length,
      labsPending: fLabs.filter(l => l.status !== 'Completed').length,
      slips: fSlips.length,
      medPct,
      lowStock: raw.lowStock.length,
      queueWaiting: fQueue.filter(q => q.status === 'Waiting').length,
    };
  }, [raw, fVisits, fRx, fLabs, fSlips, fMeasures, fQueue]);

  // ── CSV exports (flat, real rows) ──
  const csvSets = useMemo(() => ({
    'opd-visits': fVisits.map(v => ({
      date: (v.date || '').slice(0, 10),
      patient: v.patientName,
      kitNumber: v.kitNumber || '',
      diagnosis: v.diagnosis?.name || '',
      doctor: v.doctor,
      source: v.source,
      status: v.status,
      house: houseOf(v.cadetId),
    })),
    prescriptions: fRx.map(p => ({
      rxNumber: p.rxNumber,
      cadet: p.cadetName,
      house: p.houseName,
      items: (p.items || []).length,
      prescribedAt: (p.prescribedAt || '').slice(0, 10),
      status: p.status,
      dispensedAt: p.dispensedAt ? p.dispensedAt.slice(0, 10) : '',
    })),
    admissions: fAdm.map(a => ({
      admitDate: a.admitDate,
      dischargeDate: a.dischargeDate || '',
      cadet: a.cadetName,
      house: a.houseName,
      bed: a.bedNumber,
      diagnosis: a.diagnosis || '',
      status: a.status,
    })),
    'rest-duty-slips': fSlips.map(s => ({
      issueDate: s.issueDate,
      type: s.type,
      cadet: s.cadetName,
      house: s.houseName,
      duration: s.duration,
      reason: s.reason,
      status: s.status,
    })),
    'lab-orders': fLabs.map(l => ({
      orderDate: l.orderDate,
      test: l.testName,
      cadet: l.cadetName,
      priority: l.priority || '',
      status: l.status,
    })),
    'annual-medical': fMeasures.map(r => ({
      measuredAt: (r.measuredAt || '').slice(0, 10),
      cadet: cadetMap[r.cadetId]?.name || r.cadetId,
      house: cadetMap[r.cadetId]?.houseName || '',
      heightCm: r.height,
      weightKg: r.weight,
      bmi: r.bmi,
      measuredBy: r.measuredBy,
    })),
    'opd-queue': fQueue.map(q => ({
      token: q.token,
      cadet: q.cadetName,
      house: q.houseName,
      complaint: q.complaint,
      status: q.status,
      arrivalTime: q.arrivalTime,
    })),
    'diagnosis-distribution': diagnosisData,
    'medicine-consumption': consumptionData,
    'bed-occupancy': [{ date: todayIso(), occupied: kpis.bedsOccupied, total: kpis.bedsTotal, percent: kpis.bedPct }],
  }), [fVisits, fRx, fAdm, fSlips, fLabs, fMeasures, fQueue, diagnosisData, consumptionData, kpis, cadetMap, houseOf]);

  const handleExportCSV = (name) => {
    const rows = csvSets[name];
    if (!rows || !rows.length) {
      toast.error('Nothing to export for the selected period');
      return;
    }
    downloadMockFile(`${name}-${todayIso()}.csv`, toCSV(rows));
    toast.success(`Exported ${name}.csv (${rows.length} rows)`);
  };

  const handleExportSummary = () => {
    const rows = [
      { metric: 'Total Cadets', value: kpis.cadets },
      { metric: 'OPD Visits', value: kpis.visits },
      { metric: 'Prescriptions (dispensed)', value: `${kpis.rx} (${kpis.rxDispensed})` },
      { metric: 'Beds Occupied', value: `${kpis.bedsOccupied}/${kpis.bedsTotal}` },
      { metric: 'Lab Orders', value: kpis.labs },
      { metric: 'Rest/Duty Slips', value: kpis.slips },
      { metric: 'Annual Medical Completed', value: `${kpis.medPct}%` },
      { metric: 'Low-Stock Medicines', value: kpis.lowStock },
      { metric: 'Queue Waiting Now', value: kpis.queueWaiting },
    ];
    downloadMockFile(`hospital-summary-${todayIso()}.csv`, toCSV(rows));
    toast.success('Exported hospital-summary.csv');
  };

  const handlePrint = () => window.print();

  const applyFilter = () => {
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      toast.error('From date must be before To date');
      return;
    }
    setApplied({ ...dateRange });
    toast.success('Filters applied');
  };

  const resetFilter = () => {
    setDateRange({ from: '', to: '' });
    setApplied({ from: '', to: '' });
    setHouseFilter('all');
    toast.info('Filters cleared');
  };

  const handleRefresh = () => {
    load(true);
    toast.success('Reports refreshed with latest data');
  };

  if (loading) return <Loading message="Loading real-time reports…" />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  const filterActive = !!(applied.from || applied.to || houseFilter !== 'all');

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Live data from OPD, Consultation, Ward, Pharmacy, Lab, ExcuseDesk & Annual Medical${
          lastSync ? ` — updated ${lastSync.toLocaleTimeString('en-GB')}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-medium no-print">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live · auto-refresh 30s
            </span>
            <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary btn-sm no-print">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={handlePrint} className="btn-secondary btn-sm no-print">
              <Printer size={14} /> Print / PDF
            </button>
            <button onClick={handleExportSummary} className="btn-primary btn-sm no-print">
              <Download size={14} /> Export Summary
            </button>
          </div>
        }
      />

      {/* Working filters */}
      <Card className="mb-6 no-print">
        <CardBody>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="rep-from" className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
              <input id="rep-from" type="date" value={dateRange.from}
                onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))} className="input" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="rep-to" className="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
              <input id="rep-to" type="date" value={dateRange.to}
                onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))} className="input" />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="rep-house" className="block text-sm font-medium text-slate-700 mb-1.5">House</label>
              <select id="rep-house" value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} className="input">
                <option value="all">All Houses</option>
                {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <button onClick={applyFilter} className="btn-primary btn-sm h-[42px]">
              <Calendar size={14} /> Apply Filter
            </button>
            {filterActive && (
              <button onClick={resetFilter} className="btn-secondary btn-sm h-[42px]">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} iconBg="bg-blue-100 text-blue-600" value={kpis.cadets} label="Total Cadets" />
        <StatCard icon={ClipboardList} iconBg="bg-emerald-100 text-emerald-600" value={kpis.visits} label="OPD Visits" />
        <StatCard icon={Pill} iconBg="bg-amber-100 text-amber-600" value={kpis.rx} label={`Prescriptions (${kpis.rxDispensed} dispensed)`} />
        <StatCard icon={BedDouble} iconBg="bg-red-100 text-red-600" value={`${kpis.bedPct}%`} label={`Beds Occupied (${kpis.bedsOccupied}/${kpis.bedsTotal})`} />
        <StatCard icon={FlaskConical} iconBg="bg-violet-100 text-violet-600" value={kpis.labs} label={`Lab Orders (${kpis.labsPending} pending)`} />
        <StatCard icon={FileText} iconBg="bg-pink-100 text-pink-600" value={kpis.slips} label="Rest / Duty Slips" />
        <StatCard icon={Ruler} iconBg="bg-indigo-100 text-indigo-600" value={`${kpis.medPct}%`} label="Annual Medical Done" />
        <StatCard icon={AlertTriangle} iconBg="bg-orange-100 text-orange-600" value={kpis.lowStock} label="Low-Stock Medicines" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Visits by House — Daily Trend"
          subtitle={`OPD + consultation visits per day (${visitDaysTotal} in period)`}
          rows={visitDaysTotal ? visitsByDay : []}
          onExport={() => handleExportCSV('opd-visits')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visitsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {houseLineKeys.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top Diagnosis Distribution"
          subtitle="Share of real consultations in period"
          rows={diagnosisData}
          onExport={() => handleExportCSV('diagnosis-distribution')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={diagnosisData}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {diagnosisData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Medicine Consumption"
          subtitle={consumptionLabel}
          rows={consumptionData}
          onExport={() => handleExportCSV('medicine-consumption')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE3F3" />
              <XAxis dataKey="medicine" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="units" fill="#042938" radius={[6, 6, 0, 0]} maxBarSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Class-wise Cases"
          subtitle="Visits grouped by cadet class"
          rows={classData}
          onExport={() => handleExportCSV('opd-visits')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE3F3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis type="category" dataKey="className" tick={{ fontSize: 10, fill:'#64748b' }} width={130} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="cases" fill="#042938" radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Admissions vs Discharges"
          subtitle="Monthly ward movement (last 6 months)"
          rows={fAdm.length ? admissionsByMonth : []}
          onExport={() => handleExportCSV('admissions')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={admissionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE3F3" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Admitted" fill="#042938" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Discharged" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Rest / Duty Slips by Type"
          subtitle="ExcuseDesk slips issued in period"
          rows={slipTypeData}
          onExport={() => handleExportCSV('rest-duty-slips')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slipTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Lab Orders by Status"
          subtitle="Laboratory & radiology workload"
          rows={labStatusData}
          onExport={() => handleExportCSV('lab-orders')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={labStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Annual Medical — BMI Distribution"
          subtitle="Height & weight checkup results (this year)"
          rows={bmiHasData ? bmiData.filter(b => b.value > 0) : []}
          onExport={() => handleExportCSV('annual-medical')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bmiData.filter(b => b.value > 0)}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                paddingAngle={3} dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
              >
                {bmiData.filter(b => b.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Export center */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-dark-900">Export Center</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real rows from the selected period — CSV downloads instantly, Print/PDF uses your browser</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { key: 'opd-visits', name: 'OPD Visits', rows: csvSets['opd-visits'], icon: ClipboardList },
              { key: 'prescriptions', name: 'Prescriptions', rows: csvSets.prescriptions, icon: Pill },
              { key: 'admissions', name: 'Admissions', rows: csvSets.admissions, icon: BedDouble },
              { key: 'rest-duty-slips', name: 'Rest / Duty Slips', rows: csvSets['rest-duty-slips'], icon: FileText },
              { key: 'lab-orders', name: 'Lab Orders', rows: csvSets['lab-orders'], icon: FlaskConical },
              { key: 'annual-medical', name: 'Annual Medical', rows: csvSets['annual-medical'], icon: Ruler },
              { key: 'opd-queue', name: 'OPD Queue (today)', rows: csvSets['opd-queue'], icon: Users },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                    <item.icon size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.rows.length} row{item.rows.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleExportCSV(item.key)} disabled={!item.rows.length}
                    className="btn-secondary btn-sm disabled:opacity-40">
                    <Download size={14} /> CSV
                  </button>
                  <button onClick={handlePrint} className="btn-secondary btn-sm">
                    <Printer size={14} /> Print
                  </button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-dark-900">Live Snapshot</h3>
            <p className="text-xs text-slate-500 mt-0.5">Current operational state — refreshes every 30 seconds</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Beds</p>
                <p className="text-xl font-bold text-slate-800">{kpis.bedsOccupied}<span className="text-sm font-medium text-slate-400">/{kpis.bedsTotal}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">occupied now</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">OPD Queue</p>
                <p className="text-xl font-bold text-slate-800">{kpis.queueWaiting}</p>
                <p className="text-xs text-slate-500 mt-0.5">waiting now</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Pending Labs</p>
                <p className="text-xl font-bold text-slate-800">{kpis.labsPending}</p>
                <p className="text-xs text-slate-500 mt-0.5">of {kpis.labs} orders</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Prescriptions</p>
                <p className="text-xl font-bold text-slate-800">{kpis.rxDispensed}<span className="text-sm font-medium text-slate-400">/{kpis.rx}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">dispensed / issued</p>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">Annual Medical progress</p>
              <div className="mt-2 h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${kpis.medPct}%` }} />
              </div>
              <p className="text-xs text-emerald-700 mt-1.5">{fMeasures.length} of {kpis.cadets} cadets measured ({kpis.medPct}%)</p>
            </div>
            {lastSync && (
              <p className="text-xs text-slate-400 text-center">
                Last synced {lastSync.toLocaleTimeString('en-GB')} · source portals: OPD Queue, Consultation, Ward, Pharmacy, Lab, ExcuseDesk, Annual Medical
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
