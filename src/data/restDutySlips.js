// Rest / duty slips — no mock entries. Slips are only created
// through the Rest & Duty Slips page (real user action).
// Persisted so issued slips survive refreshes and show up in the
// House Master's portal (and the ExcuseDesk list) next session.

const SLIPS_KEY = 'cchms_rest_duty_slips_v1';

function loadSlips() {
  try {
    const raw = localStorage.getItem(SLIPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const restDutySlips = loadSlips();

export function saveSlips() {
  try { localStorage.setItem(SLIPS_KEY, JSON.stringify(restDutySlips)); } catch { /* ignore quota errors */ }
}

// Auto-expiry: a slip is valid only through its To date. Once today
// passes that date the slip flips Active → Expired automatically, so
// every "Active" stat/list (ExcuseDesk, House Master dashboard) stops
// counting it — while the record itself stays as history/audit trail.
// Called on each read (api.getRestDutySlips) so status is always current.
export function refreshSlipStatuses() {
  const today = new Date().toISOString().slice(0, 10);
  let changed = 0;
  for (const s of restDutySlips) {
    if (s.status !== 'Active') continue;
    const to = String(s.toDate || '').slice(0, 10);
    // ISO 'YYYY-MM-DD' compares lexicographically; skip records
    // without a parseable To date (never guess-expire).
    if (/^\d{4}-\d{2}-\d{2}$/.test(to) && to < today) {
      s.status = 'Expired';
      changed += 1;
    }
  }
  if (changed) saveSlips();
  return changed;
}
