// OPD queue — no mock entries. Rows are only created through the
// OPD Queue page (real user action). Persisted so tokens entered by
// the OPD desk survive refreshes.

import { schedulePush, registerList } from '../utils/sync';

const QUEUE_KEY = 'cchms_opd_queue_v1';

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const queue = loadQueue();
registerList('queue', queue);

export function saveQueue() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* ignore quota errors */ }
  schedulePush('queue');
}

/** Permanently delete a queue entry (synced to every device). */
export function removeQueueEntry(id) {
  const i = queue.findIndex(x => x.id === id);
  if (i === -1) return false;
  queue.splice(i, 1);
  saveQueue();
  return true;
}
