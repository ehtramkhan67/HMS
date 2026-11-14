// Recent activity feed — only created by real user actions across
// the system (consultation, admission, dispensing, lab, etc.).
// Persisted (capped) so every portal keeps showing what happened.

const ACTIVITY_KEY = 'cchms_activities_v1';
const MAX_ACTIVITIES = 100;

function loadActivities() {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const activities = loadActivities();

function saveActivities() {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities)); } catch { /* ignore quota errors */ }
}

export function addActivity({ type, message, user, cadetId }) {
  const entry = {
    id: 'activity-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: type || 'system',
    message,
    user: user || 'System',
    timestamp: new Date().toISOString(),
    cadetId: cadetId || null,
  };
  activities.unshift(entry);
  if (activities.length > MAX_ACTIVITIES) activities.length = MAX_ACTIVITIES;
  saveActivities();
  return entry;
}
