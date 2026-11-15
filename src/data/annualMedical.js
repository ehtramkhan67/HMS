// Annual medical test records — height & weight measurement only.
// One record per cadet per year, persisted across refreshes.

import { schedulePush } from '../utils/sync';

const KEY = 'cchms_annual_medical_v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(annualMedical)); } catch { /* ignore quota errors */ }
  schedulePush('annualMedical');
}

export const annualMedical = load();

export function upsertMeasurement({ cadetId, year, height, weight, bmi, measuredBy }) {
  const existing = annualMedical.find(r => r.cadetId === cadetId && r.year === year);
  if (existing) {
    existing.height = height;
    existing.weight = weight;
    existing.bmi = bmi;
    existing.measuredAt = new Date().toISOString();
    existing.measuredBy = measuredBy || existing.measuredBy;
    save();
    return existing;
  }
  const rec = {
    id: 'med-' + Date.now() + '-' + cadetId,
    cadetId,
    year,
    height,
    weight,
    bmi,
    measuredAt: new Date().toISOString(),
    measuredBy: measuredBy || '',
  };
  annualMedical.push(rec);
  save();
  return rec;
}

export const getMeasurementsByYear = (year) => annualMedical.filter(r => r.year === year);
export const getMeasurementForCadet = (cadetId, year) =>
  annualMedical.find(r => r.cadetId === cadetId && r.year === year);

export function clearMeasurements() {
  const count = annualMedical.length;
  annualMedical.length = 0;
  save();
  return count;
}

export function purgeMeasurements(keepFn) {
  let removed = 0;
  for (let i = annualMedical.length - 1; i >= 0; i--) {
    if (!keepFn(annualMedical[i])) {
      annualMedical.splice(i, 1);
      removed++;
    }
  }
  if (removed) save();
  return removed;
}
