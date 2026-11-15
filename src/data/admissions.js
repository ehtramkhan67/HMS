import { schedulePush } from '../utils/sync';

const STORAGE_KEY = 'cchms_admissions_v1';

function loadAdmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const admissions = loadAdmissions();

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

export const getAdmittedCadets = () => admissions.filter(a => a.status === 'Admitted');
export const getAdmissionById = (id) => admissions.find(a => a.id === id);
export const getAdmissionsByCadet = (cadetId) => admissions.filter(a => a.cadetId === cadetId);
