import { schedulePush, registerMap } from '../utils/sync';

export const roles = {
  doctor: {
    id: 'doctor',
    name: 'Senior Medical Officer',
    description: 'SMO — examines cadets, enters prescriptions, diagnoses, and instructions',
    permissions: ['dashboard', 'cadets', 'consultation', 'ward', 'pharmacy', 'rest-duty', 'fitness', 'reports'],
  },
  compounder: {
    id: 'compounder',
    name: 'Physician',
    description: 'Reviews SMO prescriptions, dispenses medicines, manages stock and dispensing log',
    permissions: ['dashboard', 'cadets', 'compounder'],
  },
  pharmacist: {
    id: 'pharmacist',
    name: 'Pharmacist',
    description: 'Pharmacy inventory, dispensing, stock management',
    permissions: ['dashboard', 'cadets', 'pharmacy', 'reports'],
  },
  lab: {
    id: 'lab',
    name: 'Lab Technician',
    description: 'Lab orders, sample collection, result entry, radiology',
    permissions: ['dashboard', 'cadets', 'lab', 'reports'],
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    description: 'Full system access including settings, users, and all reports',
    permissions: ['dashboard', 'cadets', 'queue', 'consultation', 'ward', 'pharmacy', 'lab', 'compounder', 'rest-duty', 'fitness', 'reports', 'settings'],
  },
  houseMaster: {
    id: 'houseMaster',
    name: 'House Master',
    description: 'Own-house portal — cadet records and rest/duty slips for their house only',
    permissions: ['dashboard', 'cadets', 'rest-duty'],
  },
};

export const users = [
  { id: 'user-1', name: 'Dr. Ahmed Raza (SMO)', email: 'ahmed.raza@cch.edu.pk', role: 'doctor', phone: '03001112233', department: 'General Medicine', status: 'Active', lastLogin: '2024-08-15T08:30:00', avatar: null },
  { id: 'user-4', name: 'Physician Kamran', email: 'kamran.cmp@cch.edu.pk', role: 'compounder', phone: '03332223344', department: 'Hospital Dispensary', status: 'Active', lastLogin: '2024-08-15T07:45:00', avatar: null },
  { id: 'user-6', name: 'Pharmacist Bilal', email: 'bilal.pharm@cch.edu.pk', role: 'pharmacist', phone: '03009998877', department: 'Pharmacy', status: 'Active', lastLogin: '2024-08-15T08:00:00', avatar: null },
  { id: 'user-7', name: 'Lab Tech. Omar', email: 'omar.lab@cch.edu.pk', role: 'lab', phone: '03116665544', department: 'Laboratory', status: 'Active', lastLogin: '2024-08-15T08:15:00', avatar: null },
  { id: 'user-8', name: 'Admin Farhan', email: 'farhan.admin@cch.edu.pk', role: 'admin', phone: '03213334455', department: 'Administration', status: 'Active', lastLogin: '2024-08-15T07:00:00', avatar: null },
  // ── 7 House Masters — one login per house, each sees only their own house ──
  { id: 'user-9', name: 'House Master Noor ul Wahab', email: 'Noor ul Wahab.hm@cch.edu.pk', role: 'houseMaster', phone: '03458887766', department: 'Jinnah House', houseId: 'house-1', houseName: 'Jinnah House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-10', name: 'House Master Farooq Ali', email: 'Farooq Ali.hm@cch.edu.pk', role: 'houseMaster', phone: '03451112233', department: 'Kushal House', houseId: 'house-2', houseName: 'Kushal House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-11', name: 'House Master Ihsan Mehmood', email: 'Ihsan Mehmood.hm@cch.edu.pk', role: 'houseMaster', phone: '03452223344', department: 'Iqbal House', houseId: 'house-3', houseName: 'Iqbal House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-12', name: 'House Master Wali Khan', email: 'Wali Khan.hm@cch.edu.pk', role: 'houseMaster', phone: '03453334455', department: 'Ayub House', houseId: 'house-4', houseName: 'Ayub House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-13', name: 'House Master Amir Khattak', email: 'Amir Khattak.hm@cch.edu.pk', role: 'houseMaster', phone: '03454445566', department: 'Munawar House', houseId: 'house-5', houseName: 'Munawar House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-14', name: 'House Master Usman Farooq', email: 'Usman Farooq.hm@cch.edu.pk', role: 'houseMaster', phone: '03455556677', department: 'Rustam House', houseId: 'house-6', houseName: 'Rustam House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
  { id: 'user-15', name: 'House Master Hazrat Bilal', email: 'Hazrat Bilal.hm@cch.edu.pk', role: 'houseMaster', phone: '03456667788', department: 'Junior House', houseId: 'house-7', houseName: 'Junior House', status: 'Active', lastLogin: '2024-08-14T20:00:00', avatar: null },
];

// Admin edits (name / role changes) survive refreshes via localStorage.
const OVERRIDES_KEY = 'cchms_user_overrides_v1';

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return {};
}

const userOverrides = loadOverrides();
users.forEach(u => {
  const o = userOverrides[u.id];
  if (o) Object.assign(u, o);
});

export function saveUserOverride(userId, patch) {
  const u = users.find(x => x.id === userId);
  if (!u) return null;
  Object.assign(u, patch);
  userOverrides[userId] = { ...(userOverrides[userId] || {}), ...patch };
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(userOverrides)); } catch { /* ignore quota errors */ }
  schedulePush('userOverrides');
  return u;
}

// Live auto-refresh: replace the override map and re-apply it so role
// changes made in Settings on another device show up immediately.
registerMap('userOverrides', (merged) => {
  for (const k of Object.keys(userOverrides)) delete userOverrides[k];
  Object.assign(userOverrides, merged);
  users.forEach(u => {
    const o = merged[u.id];
    if (o) Object.assign(u, o);
  });
});
