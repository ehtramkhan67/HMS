export const houses = [
  { id: 'house-1', name: 'Jinnah House', color: '#042938', shortName: 'JH' },    // Navy Blue
  { id: 'house-2', name: 'Kushal House', color: '#008000', shortName: 'KH' },    // Green
  { id: 'house-3', name: 'Iqbal House', color: '#00A4EF', shortName: 'IH' },     // Light Blue
  { id: 'house-4', name: 'Ayub House', color: '#ef4444', shortName: 'AH' },
  { id: 'house-5', name: 'Munawar House', color: '#00c04b', shortName: 'MH' },
  { id: 'house-6', name: 'Rustam House', color: '#dc6601', shortName: 'RH' },
  { id: 'house-7', name: 'Junior House', color: '#64748b', shortName: 'JNH' },   // Grey
];

export const classes = [
  { id: 'class-1', name: 'Class 8', level: 'Junior' },
  { id: 'class-2', name: 'Class 9', level: 'Junior' },
  { id: 'class-3', name: 'Class 10', level: 'Senior' },
  { id: 'class-4', name: 'Class 11 (FSc Pre-Medical)', level: 'Senior' },
  { id: 'class-5', name: 'Class 11 (FSc Pre-Engineering)', level: 'Senior' },
  { id: 'class-6', name: 'Class 12 (FSc Pre-Medical)', level: 'Senior' },
  { id: 'class-7', name: 'Class 12 (FSc Pre-Engineering)', level: 'Senior' },
];

// ── Cadet registry ─────────────────────────────────────────────
// No mock cadets. Cadets only enter the system when registered
// through a real entry point (Consultation, Ward & Beds admission,
// or any other module that calls registerCadet). Persisted so
// records survive page refreshes.

const REGISTERED_KEY = 'cchms_registered_cadets_v1';

function loadRegistered() {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

function saveRegistered(list) {
  try { localStorage.setItem(REGISTERED_KEY, JSON.stringify(list)); } catch { /* ignore quota errors */ }
}

export const cadets = loadRegistered();

function nextCollegeNumber() {
  const used = new Set(cadets.map(c => c.collegeNumber));
  let n = cadets.length + 1;
  let num = `CC2023${String(n).padStart(4, '0')}`;
  while (used.has(num)) {
    n += 1;
    num = `CC2023${String(n).padStart(4, '0')}`;
  }
  return num;
}

function nextKitNumber() {
  const used = new Set(cadets.map(c => c.kitNumber));
  let n = cadets.length + 1;
  let kit = `KIT-NEW-${String(n).padStart(4, '0')}`;
  while (used.has(kit)) {
    n += 1;
    kit = `KIT-NEW-${String(n).padStart(4, '0')}`;
  }
  return kit;
}

function houseByName(name) {
  const h = (name || '').trim().toLowerCase();
  if (!h) return null;
  return houses.find(x => x.name.toLowerCase() === h)
    // tolerate the API's short form ("Ayub" → "Ayub House")
    || houses.find(x => x.name.toLowerCase().startsWith(`${h} `))
    || null;
}

// ── House normalisation (shared across the app) ───────────────
// Records created on different portals store houses in mixed forms
// ("Ayub", "ayub house", "AH", "J - Jinnah"…). Map every variant
// onto the canonical house name from the houses list so House Master
// scoping and charts always agree. Blank / unknown → null.
const HOUSE_ALIASES = {
  jinnah: 'Jinnah House', jh: 'Jinnah House', j: 'Jinnah House',
  kushal: 'Kushal House', khushal: 'Kushal House', kh: 'Kushal House',
  iqbal: 'Iqbal House', ih: 'Iqbal House',
  ayub: 'Ayub House', ah: 'Ayub House',
  munawar: 'Munawar House', mh: 'Munawar House',
  rustam: 'Rustam House', rh: 'Rustam House',
  junior: 'Junior House', jnr: 'Junior House', jr: 'Junior House', jnh: 'Junior House',
};

export function normalizeHouse(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s || s === '—' || s === '-' || s === 'unassigned' || s === 'unmapped') return null;
  s = s.replace(/\.$/, '').replace(/\s+house$/, '').replace(/^house\s+/, '').replace(/\s+/g, ' ').trim();
  if (HOUSE_ALIASES[s]) return HOUSE_ALIASES[s];
  if (s.includes(' - ')) {
    const after = s.split(' - ').pop().trim();
    if (HOUSE_ALIASES[after]) return HOUSE_ALIASES[after];
    const before = s.split(' - ')[0].trim();
    if (HOUSE_ALIASES[before]) return HOUSE_ALIASES[before];
  }
  const match = houses.find(h => h.name.toLowerCase() === `${s} house`);
  return match ? match.name : null;
}

// Canonical house of any record: the explicit field first (whatever
// form it was written in), then the cadet directory via cadetId.
export function recordHouse(record) {
  if (!record) return null;
  return normalizeHouse(record.houseName)
    || normalizeHouse(cadets.find(c => c.id === record.cadetId)?.houseName);
}

export function registerCadet({ name, kitNumber = '', houseName = '', source = '' }) {
  const q = (name || '').trim().toLowerCase();
  if (!q) return null;
  const existing = cadets.find(c =>
    c.name.toLowerCase() === q ||
    (kitNumber && c.kitNumber && c.kitNumber.toLowerCase() === kitNumber.trim().toLowerCase())
  );
  if (existing) {
    // Re-registering through a portal (e.g. Annual Medical) marks the
    // cadet as belonging to that portal's list — persisted so the row
    // survives refreshes instead of only appearing in-session.
    if (source && existing.registeredVia !== source) {
      existing.registeredVia = source;
      saveRegistered(cadets);
    }
    const h = (houseName || '').trim();
    if (h && (!existing.houseName || existing.houseName === 'Unassigned')) {
      const match = houseByName(h);
      existing.houseName = match ? match.name : h;
      existing.houseId = match ? match.id : '';
      existing.houseColor = match ? match.color : '#64748B';
      saveRegistered(cadets);
    }
    return existing;
  }
  const house = houseByName(houseName);
  const cadet = {
    id: 'cadet-new-' + Date.now(),
    collegeNumber: nextCollegeNumber(),
    kitNumber: kitNumber || nextKitNumber(),
    name: name.trim(),
    houseId: house ? house.id : '',
    houseName: house ? house.name : ((houseName || '').trim() || 'Unassigned'),
    houseColor: house ? house.color : '#64748B',
    classId: '',
    className: '—',
    dateOfBirth: null,
    age: null,
    bloodGroup: '—',
    height: null,
    weight: null,
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    guardian: { name: '—', relation: '—', phone: '—', email: '—', address: '—' },
    emergencyContact: { name: '—', relation: '—', phone: '—' },
    allergies: [],
    chronicConditions: [],
    immunizations: [],
    registeredAt: new Date().toISOString(),
    registeredVia: source || 'Hospital',
  };
  cadets.push(cadet);
  saveRegistered(cadets);
  return cadet;
}

export function clearCadetsBySource(source) {
  const before = cadets.length;
  for (let i = cadets.length - 1; i >= 0; i--) {
    if (cadets[i].registeredVia === source) cadets.splice(i, 1);
  }
  if (cadets.length !== before) saveRegistered(cadets);
  return before - cadets.length;
}

export const getCadetById = (id) => cadets.find(c => c.id === id);

export function updateCadet(id, updates) {
  const c = cadets.find(x => x.id === id);
  if (!c) return null;
  Object.assign(c, updates);
  saveRegistered(cadets);
  return c;
}

export const getCadetsByHouse = (houseId) => cadets.filter(c => c.houseId === houseId);
export const getCadetsByClass = (classId) => cadets.filter(c => c.classId === classId);
export const searchCadets = (query) => {
  const q = query.toLowerCase();
  return cadets.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.collegeNumber.toLowerCase().includes(q) ||
    (c.kitNumber && c.kitNumber.toLowerCase().includes(q)) ||
    (c.kitNumber && c.kitNumber.toLowerCase().includes(q)) ||
    c.houseName.toLowerCase().includes(q) ||
    c.className.toLowerCase().includes(q)
  );
};
