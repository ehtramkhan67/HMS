// Real analytics — every value is computed at call time from the live
// stores (visits, admissions, rest/duty slips, prescriptions, cadets).
// No hardcoded sample arrays: the dashboard graphs rise and fall as
// cadets are consulted, admitted, discharged or issued slips.

import { userVisits } from './visits';
import { admissions } from './admissions';
import { restDutySlips } from './restDutySlips';
import { getCadetById, houses, recordHouse } from './cadets';
import { prescriptions } from './prescriptions';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── House normalisation ───────────────────────────────────────────
// Shared with the rest of the app (data/cadets.normalizeHouse /
// recordHouse) so dashboard house scoping, charts and portal filters
// always resolve mixed record forms ("Ayub", "AH"…) to the same
// canonical house name. Blank / unknown → null (not charted).
const houseOf = recordHouse;

// ── Date helpers ──────────────────────────────────────────────────
// All record dates in the app are stored as UTC slices (toISOString),
// so chart buckets are computed in UTC too — every record type lines
// up on the same day/week/month boundary.
function dayOf(value) {
  const s = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function fmtDay(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Last `n` month keys (YYYY-MM), ascending, ending with the current month.
function lastMonthKeys(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

// Monday-start week containing the given day → 'YYYY-MM-DD'.
function weekStartDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return fmtDay(date);
}

// Last `n` week-start days (Mondays), ascending, ending with the current week.
function lastWeekStarts(n) {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(fmtDay(d));
  }
  return out;
}

function shortDate(day) {
  return `${Number(day.slice(8, 10))} ${MONTH_LABELS[Number(day.slice(5, 7)) - 1]}`;
}

// Every real "illness event" with its day and (mapped) house:
// OPD visits + ward admissions + rest/duty slips.
function illnessEvents() {
  const events = [];
  for (const v of userVisits) {
    const day = dayOf(v.date);
    if (day) events.push({ day, house: houseOf(v) });
  }
  for (const a of admissions) {
    const day = dayOf(a.admitDate);
    if (day) events.push({ day, house: houseOf(a) });
  }
  for (const s of restDutySlips) {
    const day = dayOf(s.issueDate);
    if (day) events.push({ day, house: houseOf(s) });
  }
  return events;
}

// ── Dashboard: Illness Trends by House (monthly, last 8 months) ──
export function computeIllnessTrendsByHouse() {
  const months = lastMonthKeys(8);
  const rows = months.map(key => {
    const row = { month: MONTH_LABELS[Number(key.slice(5, 7)) - 1] };
    houses.forEach(h => { row[h.name] = 0; });
    return row;
  });
  const index = new Map(months.map((key, i) => [key, i]));
  for (const event of illnessEvents()) {
    if (!event.house) continue;
    const i = index.get(event.day.slice(0, 7));
    if (i !== undefined) rows[i][event.house] += 1;
  }
  return rows;
}

// ── Dashboard: Weekly OPD Visits (last 8 weeks, split by house) ──
// Each week's total is broken down per house so the stacked bars can
// carry the house palette. Visits with no mappable house are flagged
// Unmapped (house rule) instead of silently dropped.
export function computeWeeklyOPDVisits() {
  const weeks = lastWeekStarts(8);
  const rows = weeks.map(w => {
    const row = { week: shortDate(w) };
    houses.forEach(h => { row[h.name] = 0; });
    row.Unmapped = 0;
    return row;
  });
  const index = new Map(weeks.map((w, i) => [w, i]));
  for (const v of userVisits) {
    const day = dayOf(v.date);
    if (!day) continue;
    const i = index.get(weekStartDay(day));
    if (i === undefined) continue;
    rows[i][houseOf(v) || 'Unmapped'] += 1;
  }
  return rows;
}

// ── Illness trends by class (real visits, cadet class lookup) ────
export function computeIllnessTrendsByClass() {
  const counts = new Map();
  for (const v of userVisits) {
    const cadet = v.cadetId ? getCadetById(v.cadetId) : null;
    const cls = cadet && cadet.className && cadet.className !== '—' ? cadet.className : 'Unknown';
    counts.set(cls, (counts.get(cls) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([className, cases]) => ({ className, cases }));
}

// ── Medicine consumption (dispensed prescriptions) ───────────────
export function computeMedicineConsumption() {
  const counts = new Map();
  for (const rx of prescriptions) {
    if (rx.status !== 'Dispensed') continue;
    for (const item of rx.items || []) {
      const name = String(item.medicine || '').trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([medicine, units]) => ({ medicine, units }));
}

// ── Bed occupancy trend (admissions per month, last 8 months) ────
export function computeBedOccupancyTrend() {
  const months = lastMonthKeys(8);
  const rows = months.map(key => ({
    month: MONTH_LABELS[Number(key.slice(5, 7)) - 1],
    occupancy: 0,
  }));
  const index = new Map(months.map((key, i) => [key, i]));
  for (const a of admissions) {
    const day = dayOf(a.admitDate);
    if (!day) continue;
    const i = index.get(day.slice(0, 7));
    if (i !== undefined) rows[i].occupancy += 1;
  }
  return rows;
}

// ── Diagnosis distribution (real visit diagnoses) ────────────────
export function computeDiagnosisDistribution() {
  const counts = new Map();
  for (const v of userVisits) {
    const name = typeof v.diagnosis === 'object' && v.diagnosis
      ? v.diagnosis.name
      : v.diagnosis;
    const key = String(name || '').trim();
    if (!key || key === '—') continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
  const rest = sorted.slice(5).reduce((sum, [, n]) => sum + n, 0);
  if (rest > 0) top.push({ name: 'Other', value: rest });
  return top;
}
