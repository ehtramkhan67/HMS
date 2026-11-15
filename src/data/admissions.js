import { schedulePush, registerList } from '../utils/sync';

const STORAGE_KEY = 'cchms_admissions_v1';

function loadAdmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const admissions = loadAdmissions();
registerList('admissions', admissions);

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(admissions)); } catch { /* ignore quota errors */ }
  schedulePush('admissions');
}

export function addAdmission(record) {
  admissions.push(record);
  persist();
  return record;
}

export function dischargeAdmission(bedId) {
  const adm = [...admissions].reverse().find(a => a.bedId === bedId && a.status === 'Admitted');
  if (adm) {
    adm.status = 'Discharged';
    adm.dischargeDate = new Date().toISOString().split('T')[0];
    persist();
  }
  return adm;
}

/** Merge updates into an admission and persist (synced to every device). */
export function updateAdmission(id, updates) {
  const adm = admissions.find(a => a.id === id);
  if (!adm) return null;
  Object.assign(adm, updates);
  persist();
  return adm;
}

/**
 * Append a nursing note to an admission. Notes are stored newest-last so the
 * Ward modal can render them in the order they were written.
 */
export function addNursingNote(admissionId, { note, by }) {
  const adm = admissions.find(a => a.id === admissionId);
  if (!adm) return null;
  const entry = {
    note,
    by: by || 'Nursing staff',
    time: new Date().toISOString(),
  };
  if (!Array.isArray(adm.nursingNotes)) adm.nursingNotes = [];
  adm.nursingNotes.push(entry);
  persist();
  return entry;
}

export const getAdmittedCadets = () => admissions.filter(a => a.status === 'Admitted');
export const getAdmissionById = (id) => admissions.find(a => a.id === id);
export const getAdmissionsByCadet = (cadetId) => admissions.filter(a => a.cadetId === cadetId);

/** Permanently delete an admission record (synced to every device). */
export function removeAdmission(id) {
  const i = admissions.findIndex(a => a.id === id);
  if (i === -1) return null;
  const [removed] = admissions.splice(i, 1);
  persist();
  return removed;
}
