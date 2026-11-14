// Visits recorded by real user actions (Consultation, Ward & Beds).
// No mock visits — everything here is created through the app and
// persisted so it survives refreshes.

const USER_VISITS_KEY = 'cchms_user_visits_v1';

function loadUserVisits() {
  try {
    const raw = localStorage.getItem(USER_VISITS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

function saveUserVisits() {
  try { localStorage.setItem(USER_VISITS_KEY, JSON.stringify(userVisits)); } catch { /* ignore quota errors */ }
}

export const userVisits = loadUserVisits();

// Kept for compatibility with older mock references.
export const visits = [];

export function addUserVisit(visit) {
  userVisits.unshift(visit);
  saveUserVisits();
  return visit;
}

export function updateUserVisit(id, updates) {
  const v = userVisits.find(x => x.id === id);
  if (v) {
    Object.assign(v, updates);
    saveUserVisits();
  }
  return v;
}

export const getVisitsByCadet = (cadetId) =>
  userVisits.filter(v => v.cadetId === cadetId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

export const getRecentVisits = (limit = 10) =>
  [...userVisits].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

export const getTodayVisits = () => {
  const today = new Date().toDateString();
  return userVisits.filter(v => new Date(v.date).toDateString() === today);
};
