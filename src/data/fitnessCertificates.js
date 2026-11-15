// Fitness certificates & admission medicals — no mock entries.
// Records are only created through the Fitness & Medicals page
// (real user action). Persisted so they survive refreshes.

import { schedulePush, registerList } from '../utils/sync';

const CERTS_KEY = 'cchms_fitness_certs_v1';
const ADM_MED_KEY = 'cchms_admission_medicals_v1';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

function save(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore quota errors */ }
  schedulePush(key === CERTS_KEY ? 'fitnessCertificates' : 'admissionMedicals');
}

export const fitnessCertificates = load(CERTS_KEY);
export const admissionMedicals = load(ADM_MED_KEY);
registerList('fitnessCertificates', fitnessCertificates);
registerList('admissionMedicals', admissionMedicals);

export const saveFitnessCertificates = () => save(CERTS_KEY, fitnessCertificates);
export const saveAdmissionMedicals = () => save(ADM_MED_KEY, admissionMedicals);

/** Permanently delete a fitness certificate (synced to every device). */
export function removeFitnessCertificate(id) {
  const i = fitnessCertificates.findIndex(c => c.id === id);
  if (i === -1) return false;
  fitnessCertificates.splice(i, 1);
  saveFitnessCertificates();
  return true;
}

/** Permanently delete an admission medical exam (synced to every device). */
export function removeAdmissionMedical(id) {
  const i = admissionMedicals.findIndex(m => m.id === id);
  if (i === -1) return false;
  admissionMedicals.splice(i, 1);
  saveAdmissionMedicals();
  return true;
}
