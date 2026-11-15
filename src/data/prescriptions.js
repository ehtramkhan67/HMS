/**
 * Prescriptions issued by the Senior Medical Officer (SMO).
 * They appear in the Physician Portal as "Pending" until dispensed.
 *
 * No mock prescriptions — entries are only created by real
 * consultations and are persisted so they survive refreshes.
 */

import { schedulePush, registerList } from '../utils/sync';

const RX_KEY = 'cchms_prescriptions_v1';

function loadRx() {
  try {
    const raw = localStorage.getItem(RX_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

function saveRx() {
  try { localStorage.setItem(RX_KEY, JSON.stringify(prescriptions)); } catch { /* ignore quota errors */ }
  schedulePush('prescriptions');
}

export const prescriptions = loadRx();
registerList('prescriptions', prescriptions);

let rxCounter = 100 + prescriptions.length;

function makeRxNumber() {
  rxCounter += 1;
  return `RX-${new Date().getFullYear()}-${String(rxCounter).padStart(4, '0')}`;
}

/** Called by the Consultation page (SMO) after saving a consultation. */
export function addPrescriptionFromVisit({ cadet, diagnosis, symptoms, advice, items, doctor }) {
  const rx = {
    id: 'rx-' + Date.now(),
    rxNumber: makeRxNumber(),
    cadetId: cadet.id,
    cadetName: cadet.name,
    collegeNumber: cadet.collegeNumber,
    kitNumber: cadet.kitNumber,
    houseName: cadet.houseName,
    className: cadet.className,
    prescribedBy: doctor || 'SMO',
    prescribedAt: new Date().toISOString(),
    diagnosis,
    symptoms,
    instructions: advice || '',
    items: items.map(i => ({ medicineId: i.medicineId || null, medicine: i.medicine, dose: i.dose, frequency: i.frequency, duration: i.duration })),
    status: 'Pending',
    dispensedBy: null,
    dispensedAt: null,
    dispenseNotes: '',
  };
  prescriptions.unshift(rx);
  saveRx();
  return rx;
}

export function getPrescriptionById(id) {
  return prescriptions.find(p => p.id === id);
}

export function updatePrescription(id, updates) {
  const rx = getPrescriptionById(id);
  if (rx) {
    Object.assign(rx, updates);
    saveRx();
  }
  return rx;
}

/** Permanently delete a prescription (synced to every device). */
export function removePrescription(id) {
  const i = prescriptions.findIndex(p => p.id === id);
  if (i === -1) return false;
  prescriptions.splice(i, 1);
  saveRx();
  return true;
}
