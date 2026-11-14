export const wards = [
  { id: 'ward-1', name: 'General Ward', floor: 'Ground Floor', beds: 20 },
];

const STORAGE_KEY = 'cchms_bed_state_v1';

function loadBedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return {};
}

function saveBedState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore quota errors */ }
}

const bedState = loadBedState();

function generateBeds(ward) {
  return Array.from({ length: ward.beds }, (_, i) => {
    const id = `${ward.id}-bed-${i + 1}`;
    const saved = bedState[id] || {};
    return {
      id,
      wardId: ward.id,
      wardName: ward.name,
      number: `W-${String(i + 1).padStart(2, '0')}`,
      status: saved.status || 'available',
      patientId: saved.patientId ?? null,
      patientName: saved.patientName ?? null,
      admittedAt: saved.admittedAt ?? null,
      diagnosis: saved.diagnosis ?? null,
    };
  });
}

export const allBeds = wards.flatMap(w => generateBeds(w));

export function updateBed(bedId, updates) {
  const bed = allBeds.find(b => b.id === bedId);
  if (!bed) return null;
  Object.assign(bed, updates);
  bedState[bedId] = {
    status: bed.status,
    patientId: bed.patientId,
    patientName: bed.patientName,
    admittedAt: bed.admittedAt,
    diagnosis: bed.diagnosis,
  };
  saveBedState(bedState);
  return bed;
}

export const getBedsByWard = (wardId) => allBeds.filter(b => b.wardId === wardId);
export const getBedStats = () => {
  const total = allBeds.length;
  const occupied = allBeds.filter(b => b.status === 'occupied').length;
  const available = allBeds.filter(b => b.status === 'available').length;
  const reserved = allBeds.filter(b => b.status === 'reserved').length;
  const maintenance = allBeds.filter(b => b.status === 'maintenance').length;
  return { total, occupied, available, reserved, maintenance, occupancyRate: total ? Math.round((occupied / total) * 100) : 0 };
};
