// Lab test catalog (static reference data).
// Orders list starts empty — orders are only created through the
// Lab & Radiology page (real user action).

const labTests = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', price: 350 },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', price: 200 },
  { code: 'RBS', name: 'Random Blood Sugar', category: 'Biochemistry', price: 150 },
  { code: 'LFT', name: 'Liver Function Tests', category: 'Biochemistry', price: 600 },
  { code: 'RFT', name: 'Renal Function Tests', category: 'Biochemistry', price: 550 },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 700 },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrinology', price: 500 },
  { code: 'URINE-R', name: 'Urine Routine', category: 'Clinical Pathology', price: 150 },
  { code: 'URINE-C', name: 'Urine Culture', category: 'Microbiology', price: 800 },
  { code: 'CRP', name: 'C-Reactive Protein', category: 'Immunology', price: 450 },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', price: 150 },
  { code: 'DENGUE', name: 'Dengue NS1 + IgM/IgG', category: 'Serology', price: 1200 },
  { code: 'MALARIA', name: 'Malaria Parasite (MP)', category: 'Microbiology', price: 250 },
  { code: 'WIDAL', name: 'Widal Test', category: 'Serology', price: 400 },
  { code: 'HEMOGRAM', name: 'Peripheral Blood Smear', category: 'Hematology', price: 300 },
  { code: 'XRAY-CHEST', name: 'X-Ray Chest PA', category: 'Radiology', price: 500 },
  { code: 'XRAY-ANKLE', name: 'X-Ray Ankle', category: 'Radiology', price: 450 },
  { code: 'USG-ABD', name: 'Ultrasound Abdomen', category: 'Radiology', price: 1500 },
  { code: 'ECG', name: 'Electrocardiogram', category: 'Cardiology', price: 400 },
  { code: 'AUDIO', name: 'Audiometry', category: 'ENT', price: 600 },
];

// Orders are persisted so lab data entered by the Lab portal
// survives refreshes (and feeds dashboards/House Master views).
import { schedulePush, registerList } from '../utils/sync';

const ORDERS_KEY = 'cchms_lab_orders_v1';

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt storage */ }
  return [];
}

export const labOrders = loadOrders();
registerList('labOrders', labOrders);

export function saveLabOrders() {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(labOrders)); } catch { /* ignore quota errors */ }
  schedulePush('labOrders');
}

export const labTestCatalog = labTests;
export const getLabOrdersByCadet = (cadetId) => labOrders.filter(l => l.cadetId === cadetId);
export const getPendingLabOrders = () => labOrders.filter(l => l.status !== 'Completed');
export const getCompletedLabOrders = () => labOrders.filter(l => l.status === 'Completed');

/** Permanently delete a lab order (synced to every device). */
export function removeLabOrder(id) {
  const i = labOrders.findIndex(l => l.id === id);
  if (i === -1) return false;
  labOrders.splice(i, 1);
  saveLabOrders();
  return true;
}
