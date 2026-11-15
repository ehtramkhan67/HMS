// Pharmacy dispensing log — direct dispenses made from the Pharmacy
// page (outside a prescription flow). Persisted + synced like every
// other collection so the log is the same on every device.

import { schedulePush, registerList } from '../utils/sync';

const KEY = 'cchms_dispense_log_v1';
const MAX_ENTRIES = 500;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const dispenseLog = load();
registerList('dispenseLog', dispenseLog);

export function saveDispenseLog() {
  try { localStorage.setItem(KEY, JSON.stringify(dispenseLog)); } catch { /* ignore quota errors */ }
  schedulePush('dispenseLog');
}

export function addDispenseEntry(entry) {
  dispenseLog.unshift(entry);
  if (dispenseLog.length > MAX_ENTRIES) dispenseLog.length = MAX_ENTRIES;
  saveDispenseLog();
  return entry;
}
