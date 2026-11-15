// OPD queue — no mock entries. Rows are only created through the
// OPD Queue page (real user action). Persisted so tokens entered by
// the OPD desk survive refreshes.

import { schedulePush } from '../utils/sync';

const QUEUE_KEY = 'cchms_opd_queue_v1';

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const queue = loadQueue();

export function saveQueue() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* ignore quota errors */ }
  schedulePush('queue');
}
