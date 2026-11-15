// API Layer — application data access layer.
// All reads/writes go through the data modules in src/data/*, which
// persist to localStorage and are mirrored to the backend by
// src/utils/sync.js (cross-device sync).
// Keep the same function signatures so the rest of the app needs no changes.

import { cadets, getCadetById, searchCadets, registerCadet, clearCadetsBySource, houses, normalizeHouse, recordHouse, removeCadet } from '../data/cadets';
import { medicines, getLowStockMedicines, getNearExpiryMedicines, saveMedicines, removeMedicine } from '../data/medicines';
import { addDispenseEntry } from '../data/dispenseLog';
import { visits, getVisitsByCadet, getRecentVisits, userVisits, addUserVisit, updateUserVisit, removeUserVisit } from '../data/visits';
import { admissions, getAdmittedCadets, addAdmission, dischargeAdmission, removeAdmission } from '../data/admissions';
import { labOrders, getPendingLabOrders, saveLabOrders, removeLabOrder } from '../data/labOrders';
import { queue, saveQueue, removeQueueEntry } from '../data/queue';
import { allBeds, getBedsByWard, getBedStats, wards, updateBed } from '../data/beds';
import { activities, addActivity } from '../data/activities';
import { users, roles, saveUserOverride } from '../data/users';
import { restDutySlips, saveSlips, refreshSlipStatuses, removeSlip } from '../data/restDutySlips';
import { fitnessCertificates, admissionMedicals, saveFitnessCertificates, saveAdmissionMedicals, removeFitnessCertificate, removeAdmissionMedical } from '../data/fitnessCertificates';
import { upsertMeasurement, getMeasurementsByYear, clearMeasurements, purgeMeasurements, removeMeasurement } from '../data/annualMedical';
import {
  computeIllnessTrendsByHouse, computeWeeklyOPDVisits, computeIllnessTrendsByClass,
  computeMedicineConsumption, computeBedOccupancyTrend, computeDiagnosisDistribution,
} from '../data/analytics';
import { prescriptions as prescriptionList, addPrescriptionFromVisit, getPrescriptionById, updatePrescription, removePrescription } from '../data/prescriptions';

// Simulate network latency for realistic loading states
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // ── Auth ──
  login: async (email, role) => {
    await delay(600);
    if (!email || !role) throw new Error('Email and role are required');
    const user = users.find(u => u.email === email) || users.find(u => u.role === role);
    return { user, token: 'mock-jwt-token-' + Date.now() };
  },
  logout: async () => { await delay(200); return { success: true }; },

  // ── Cadets ──
  getCadets: async (filters = {}) => {
    await delay();
    let data = [...cadets];
    if (filters.search) data = data.filter(c => c.name.toLowerCase().includes(filters.search.toLowerCase()) || c.collegeNumber.toLowerCase().includes(filters.search.toLowerCase()) || (c.kitNumber && c.kitNumber.toLowerCase().includes(filters.search.toLowerCase())));
    if (filters.house) {
      // Match by house id first, then by canonical house name so a
      // cadet whose houseId is missing (but house name is set) still
      // shows in the House Master's own-house view.
      const houseId = filters.house;
      const canon = normalizeHouse(houses.find(h => h.id === houseId)?.name || houseId);
      data = data.filter(c => c.houseId === houseId || (canon && normalizeHouse(c.houseName) === canon));
    }
    if (filters.className) data = data.filter(c => c.classId === filters.className);
    return data;
  },
  getCadet: async (id) => { await delay(); return getCadetById(id); },
  searchCadets: async (q) => { await delay(200); return searchCadets(q); },
  registerCadet: async (data) => { await delay(200); return registerCadet(data); },

  // ── Visits ──
  getVisits: async () => { await delay(); return [...userVisits, ...visits]; },
  getVisitsByCadet: async (cadetId) => { await delay(); return getVisitsByCadet(cadetId); },
  getRecentVisits: async (limit) => { await delay(); return getRecentVisits(limit); },
  createVisit: async (payload) => {
    await delay(500);
    const visit = {
      id: 'visit-' + Date.now(),
      cadetId: payload.cadetId || null,
      patientName: payload.patientName || '',
      kitNumber: payload.kitNumber || '',
      houseName: payload.houseName || '',
      date: new Date().toISOString(),
      type: payload.type || 'OPD Consultation',
      doctor: payload.doctor || 'SMO',
      diagnosis: typeof payload.diagnosis === 'string'
        ? { code: '—', name: payload.diagnosis }
        : (payload.diagnosis || { code: '—', name: '—' }),
      symptoms: payload.symptoms || [],
      advice: payload.advice || '',
      prescription: payload.prescription || [],
      vitals: payload.vitals || null,
      status: 'Completed',
      source: payload.source || 'Consultation',
    };
    addUserVisit(visit);
    addActivity({
      type: 'consultation',
      message: `Consultation saved for ${visit.patientName}`,
      user: visit.doctor,
      cadetId: visit.cadetId,
    });
    return visit;
  },

  // ── Queue ──
  getQueue: async () => { await delay(); return [...queue]; },
  addToQueue: async (entry) => {
    await delay(400);
    const record = { ...entry, id: 'queue-' + Date.now(), token: queue.length + 1, status: 'Waiting', arrivalTime: new Date().toTimeString().slice(0, 5) };
    queue.push(record);
    saveQueue();
    if (record.cadetName) {
      addActivity({ type: 'sick-report', message: `OPD visit registered for ${record.cadetName}`, user: record.consultingDoctor || 'OPD', cadetId: record.cadetId });
    }
    return record;
  },
  updateQueueStatus: async (id, status) => {
    await delay(300);
    const q = queue.find(x => x.id === id);
    if (q) { q.status = status; saveQueue(); }
    return { id, status };
  },

  // ── Admissions / Ward ──
  getAdmissions: async () => { await delay(); return [...admissions]; },
  getAdmitted: async () => { await delay(); return getAdmittedCadets(); },
  getBeds: async (wardId) => { await delay(); return wardId ? getBedsByWard(wardId) : allBeds; },
  getBedStats: async () => { await delay(); return getBedStats(); },
  getWards: async () => { await delay(); return wards; },
  admitCadet: async (data) => {
    await delay(500);
    const bedQuery = (data.bedId || '').trim().toLowerCase();
    let bed = allBeds.find(b => b.id.toLowerCase() === bedQuery || b.number.toLowerCase() === bedQuery);
    if (!bed && /^\d+$/.test(bedQuery)) {
      bed = allBeds.find(b => b.number.toLowerCase() === `w-${bedQuery.padStart(2, '0')}`);
    }
    if (!bed) throw new Error('Bed not found — enter a valid bed number like W-01');
    if (bed.status !== 'available') throw new Error('Bed is not available');
    const cadetQuery = (data.cadetId || '').trim();
    if (!cadetQuery) throw new Error('Cadet name is required');
    const kitQuery = (data.kitNumber || '').trim().toLowerCase();
    const cadet = (kitQuery && cadets.find(c => c.kitNumber && c.kitNumber.toLowerCase() === kitQuery))
      || getCadetById(cadetQuery)
      || cadets.find(c => c.collegeNumber.toLowerCase() === cadetQuery.toLowerCase())
      || cadets.find(c => c.name.toLowerCase() === cadetQuery.toLowerCase())
      || cadets.find(c => c.name.toLowerCase().includes(cadetQuery.toLowerCase()))
      || registerCadet({ name: cadetQuery, kitNumber: (data.kitNumber || '').trim(), houseName: (data.houseName || '').trim() });
    // Pass the kit/house captured in the Admit form through to the
    // cadet record so dashboard house charts see the house. registerCadet
    // only fills an empty/Unassigned house — a real house is never overwritten.
    if (cadet && (data.houseName || '').trim()) {
      registerCadet({
        name: cadet.name,
        kitNumber: cadet.kitNumber || (data.kitNumber || '').trim(),
        houseName: data.houseName.trim(),
      });
    }
    const ward = wards.find(w => w.id === bed.wardId);
    updateBed(bed.id, {
      status: 'occupied',
      patientId: cadet ? cadet.id : null,
      patientName: cadet ? cadet.name : cadetQuery,
      admittedAt: new Date().toISOString(),
      diagnosis: data.diagnosis,
    });
    const record = {
      id: 'adm-' + Date.now(),
      cadetId: cadet ? cadet.id : 'walk-in-' + Date.now(),
      cadetName: cadet ? cadet.name : cadetQuery,
      collegeNumber: cadet ? cadet.collegeNumber : '—',
      kitNumber: cadet && cadet.kitNumber ? cadet.kitNumber : '—',
      houseName: cadet ? (normalizeHouse(cadet.houseName) || cadet.houseName) : '—',
      ward: ward ? ward.name : bed.wardName,
      bedId: bed.id,
      bedNumber: bed.number,
      admitDate: new Date().toISOString().split('T')[0],
      dischargeDate: null,
      status: 'Admitted',
      diagnosis: data.diagnosis,
      consultant: data.consultant,
      admittedBy: data.consultant,
      nursingNotes: [],
      medicationChart: [],
    };
    addAdmission(record);
    addActivity({ type: 'admission', message: `New admission: ${record.cadetName} to ${record.ward} (${record.bedNumber})`, user: record.consultant, cadetId: record.cadetId });
    // Link admission into the cadet's medical record (Cadet Records → Profile → Visits)
    if (cadet) {
      addUserVisit({
        id: 'visit-' + Date.now(),
        admissionId: record.id,
        cadetId: cadet.id,
        patientName: cadet.name,
        kitNumber: cadet.kitNumber || '',
        houseName: cadet.houseName || '',
        date: new Date().toISOString(),
        type: 'Admission',
        doctor: data.consultant,
        diagnosis: { code: '—', name: data.diagnosis },
        symptoms: [],
        advice: `Admitted to ${record.ward} / ${record.bedNumber}`,
        prescription: [],
        vitals: null,
        status: 'Admitted',
        source: 'Ward & Beds',
      });
    }
    return record;
  },
  dischargeCadet: async (bedId) => {
    await delay(500);
    const bed = allBeds.find(b => b.id === bedId);
    if (bed) {
      updateBed(bedId, { status: 'available', patientId: null, patientName: null, admittedAt: null, diagnosis: null });
    }
    const adm = dischargeAdmission(bedId);
    if (adm) {
      addActivity({ type: 'discharge', message: `Discharged: ${adm.cadetName} from ${adm.ward} (${adm.bedNumber})`, user: adm.consultant, cadetId: adm.cadetId });
      const linked = userVisits.find(v => v.admissionId === adm.id && v.status === 'Admitted');
      if (linked) {
        updateUserVisit(linked.id, {
          status: 'Discharged',
          advice: `Discharged from ${adm.ward} / ${adm.bedNumber}`,
        });
      }
    }
    return { id: bedId, status: 'Discharged', dischargeDate: new Date().toISOString().split('T')[0] };
  },

  // ── Pharmacy ──
  getMedicines: async (filters = {}) => {
    await delay();
    let data = [...medicines];
    if (filters.search) data = data.filter(m => m.name.toLowerCase().includes(filters.search.toLowerCase()) || m.genericName.toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.lowStock) data = getLowStockMedicines();
    if (filters.nearExpiry) data = getNearExpiryMedicines();
    return data;
  },
  getLowStock: async () => { await delay(); return getLowStockMedicines(); },
  adjustStock: async (id, adjustment) => {
    await delay(400);
    const med = medicines.find(m => m.id === id);
    if (med) med.stock = Math.max(0, med.stock + adjustment);
    if (med) saveMedicines();
    return { id, adjustment, stock: med ? med.stock : null };
  },
  dispenseMedicine: async (dispenseData) => {
    await delay(500);
    const entry = { ...dispenseData, id: 'disp-' + Date.now(), dispensedAt: new Date().toISOString() };
    addDispenseEntry(entry);
    return entry;
  },

  // ── Physician / Prescriptions (SMO → Physician flow) ──
  getPrescriptions: async (filters = {}) => {
    await delay();
    let data = [...prescriptionList];
    if (filters.status) data = data.filter(p => p.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(p =>
        (p.kitNumber && p.kitNumber.toLowerCase().includes(q)) ||
        p.cadetName.toLowerCase().includes(q) ||
        p.collegeNumber.toLowerCase().includes(q) ||
        p.rxNumber.toLowerCase().includes(q)
      );
    }
    return data;
  },
  getPendingPrescriptions: async (search) => api.getPrescriptions({ status: 'Pending', search }),
  getDispensedPrescriptions: async (search) => api.getPrescriptions({ status: 'Dispensed', search }),
  createPrescriptionFromVisit: async (payload) => {
    await delay(500);
    const rx = addPrescriptionFromVisit(payload);
    addActivity({ type: 'prescription', message: `Prescription ${rx.rxNumber} issued for ${rx.cadetName}`, user: rx.prescribedBy, cadetId: rx.cadetId });
    return rx;
  },
  dispensePrescription: async (id, { dispensedBy, notes }) => {
    await delay(500);
    const rx = getPrescriptionById(id);
    if (!rx) throw new Error('Prescription not found');
    if (rx.status === 'Dispensed') throw new Error('Already dispensed');
    updatePrescription(id, {
      status: 'Dispensed',
      dispensedBy: dispensedBy || 'Physician',
      dispensedAt: new Date().toISOString(),
      dispenseNotes: notes || '',
    });
    // Decrement stock for each medicine in the prescription
    rx.items.forEach(item => {
      if (!item.medicineId) return;
      const med = medicines.find(m => m.id === item.medicineId);
      if (med) med.stock = Math.max(0, med.stock - 1);
    });
    saveMedicines();
    addActivity({ type: 'dispense', message: `Medicine dispensed for ${rx.cadetName}`, user: rx.dispensedBy, cadetId: rx.cadetId });
    return { ...rx };
  },

  // ── Lab ──
  getLabOrders: async () => { await delay(); return [...labOrders]; },
  getPendingLabOrders: async () => { await delay(); return getPendingLabOrders(); },
  updateLabOrder: async (id, updates) => {
    await delay(400);
    const order = labOrders.find(o => o.id === id);
    if (order) { Object.assign(order, updates); saveLabOrders(); }
    return { id, ...updates };
  },
  createLabOrder: async (order) => {
    await delay(500);
    const record = { ...order, id: 'lab-' + Date.now(), status: 'Ordered' };
    labOrders.unshift(record);
    saveLabOrders();
    addActivity({ type: 'lab', message: `Lab order ${record.testCode || ''} placed for ${record.cadetName || 'patient'}`, user: record.orderedBy, cadetId: record.cadetId });
    return record;
  },

  // ── Rest / Duty Slips ──
  getRestDutySlips: async () => { await delay(); refreshSlipStatuses(); return [...restDutySlips]; },
  createRestDutySlip: async (slip) => {
    await delay(500);
    const record = { ...slip, id: 'slip-' + Date.now(), status: 'Active' };
    // Store the canonical house ("Ayub" → "Ayub House") so House
    // Master scoping matches regardless of which portal/autofill wrote it.
    record.houseName = recordHouse(record) || record.houseName || '';
    restDutySlips.unshift(record);
    saveSlips();
    addActivity({ type: 'rest-slip', message: `${record.type} slip issued for ${record.cadetName}`, user: record.issuedBy, cadetId: record.cadetId });
    return record;
  },

  // ── Annual Medical (Height & Weight) ──
  getAnnualMedical: async () => {
    await delay();
    const year = new Date().getFullYear();
    return getMeasurementsByYear(year);
  },
  saveMeasurement: async ({ cadetId, height, weight, measuredBy }) => {
    await delay(300);
    const cadet = getCadetById(cadetId);
    if (!cadet) throw new Error('Cadet not found');
    const h = Number(height);
    const w = Number(weight);
    if (!(h >= 50 && h <= 250)) throw new Error('Height must be between 50–250 cm');
    if (!(w >= 20 && w <= 200)) throw new Error('Weight must be between 20–200 kg');
    const bmi = Math.round((w / ((h / 100) ** 2)) * 10) / 10;
    const rec = upsertMeasurement({
      cadetId,
      year: new Date().getFullYear(),
      height: h,
      weight: w,
      bmi,
      measuredBy,
    });
    return { ...rec, cadetName: cadet.name };
  },
  clearAnnualMedicalData: async ({ clearMeasurementsToo = true, clearCadetsToo = false } = {}) => {
    await delay(400);
    let measurements = 0;
    let removedCadets = 0;
    if (clearMeasurementsToo) {
      measurements = clearMeasurements();
    }
    if (clearCadetsToo) {
      removedCadets = clearCadetsBySource('Annual Medical');
      if (!clearMeasurementsToo) purgeMeasurements(r => !!getCadetById(r.cadetId));
    }
    return { measurements, removedCadets };
  },

  // ── Fitness Certificates ──
  getFitnessCertificates: async () => { await delay(); return [...fitnessCertificates]; },
  createFitnessCertificate: async (cert) => {
    await delay(500);
    const record = { ...cert, id: 'fit-' + Date.now() };
    fitnessCertificates.unshift(record);
    saveFitnessCertificates();
    addActivity({ type: 'fitness', message: `Fitness certificate issued for ${record.cadetName}`, user: record.examinedBy, cadetId: record.cadetId });
    return record;
  },
  getAdmissionMedicals: async () => { await delay(); return [...admissionMedicals]; },
  createAdmissionMedical: async (medical) => {
    await delay(500);
    const record = { ...medical, id: 'adm-med-' + Date.now() };
    admissionMedicals.unshift(record);
    saveAdmissionMedicals();
    addActivity({ type: 'medical', message: `Admission medical exam recorded for ${record.cadetName}`, user: record.examinedBy, cadetId: record.cadetId });
    return record;
  },

  // ── Analytics ──
  // Computed live from real records (visits, admissions, slips, rx) —
  // values change whenever cadets are consulted, admitted or issued slips.
  getIllnessTrendsByHouse: async () => { await delay(); return computeIllnessTrendsByHouse(); },
  getWeeklyOPDVisits: async () => { await delay(); return computeWeeklyOPDVisits(); },
  getIllnessTrendsByClass: async () => { await delay(); return computeIllnessTrendsByClass(); },
  getMedicineConsumption: async () => { await delay(); return computeMedicineConsumption(); },
  getBedOccupancyTrend: async () => { await delay(); return computeBedOccupancyTrend(); },
  getDiagnosisDistribution: async () => { await delay(); return computeDiagnosisDistribution(); },

  // ── Activities ──
  getActivities: async (limit = 10) => { await delay(); return activities.slice(0, limit); },

  // ── Users / Roles ──
  getUsers: async () => { await delay(); return users; },
  getRoles: async () => { await delay(); return Object.values(roles); },
  updateUserRole: async (userId, patch) => {
    await delay(400);
    return saveUserOverride(userId, typeof patch === 'string' ? { role: patch } : patch);
  },

  // ── Permanent deletes ──
  // Each call removes the record from its collection; the save that
  // follows re-uploads the collection, so the deletion propagates to
  // every device (and the database) on the next sync.
  deleteQueueEntry: async (id) => { await delay(300); return removeQueueEntry(id); },
  deleteVisit: async (id) => { await delay(300); return removeUserVisit(id); },
  deleteAdmission: async (id) => {
    await delay(400);
    const adm = removeAdmission(id);
    if (!adm) return false;
    // A still-admitted record occupies a bed — free it so the ward view
    // stays consistent after the record is gone.
    if (adm.status === 'Admitted' && adm.bedId) {
      updateBed(adm.bedId, { status: 'available', patientId: null, patientName: null, admittedAt: null, diagnosis: null });
    }
    return true;
  },
  deleteLabOrder: async (id) => { await delay(300); return removeLabOrder(id); },
  deletePrescription: async (id) => { await delay(300); return removePrescription(id); },
  deleteSlip: async (id) => { await delay(300); return removeSlip(id); },
  deleteFitnessCertificate: async (id) => { await delay(300); return removeFitnessCertificate(id); },
  deleteAdmissionMedical: async (id) => { await delay(300); return removeAdmissionMedical(id); },
  deleteMeasurement: async (id) => { await delay(300); return removeMeasurement(id); },
  deleteMedicine: async (id) => { await delay(300); return removeMedicine(id); },
  deleteCadet: async (id) => { await delay(300); return removeCadet(id); },
};
