import { schedulePush, registerList } from '../utils/sync';

const STORAGE_KEY = 'cchms_medicines_v1';

// Built-in catalog — used until a synced copy exists (stock levels are
// edited through the Pharmacy page and then persisted + synced).
const DEFAULT_MEDICINES = [
  { id: 'med-1', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', batchNo: 'PCM-2024-001', expiry: '2025-12-31', stock: 450, minStock: 100, price: 2.5, unit: 'tablet', supplier: 'Getz Pharma', location: 'Shelf A1' },
  { id: 'med-2', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', batchNo: 'IBU-2024-002', expiry: '2025-08-15', stock: 85, minStock: 100, price: 3.5, unit: 'tablet', supplier: 'GSK Pakistan', location: 'Shelf A1' },
  { id: 'med-3', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', batchNo: 'AMX-2024-003', expiry: '2025-06-30', stock: 200, minStock: 80, price: 8, unit: 'capsule', supplier: 'Hoechst Pakistan', location: 'Shelf B1' },
  { id: 'med-4', name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'Antibiotic', batchNo: 'AZI-2024-004', expiry: '2025-10-31', stock: 120, minStock: 50, price: 15, unit: 'tablet', supplier: 'Sami Pharma', location: 'Shelf B1' },
  { id: 'med-5', name: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', category: 'Antihistamine', batchNo: 'CTZ-2024-005', expiry: '2026-01-31', stock: 300, minStock: 60, price: 3, unit: 'tablet', supplier: 'GSK Pakistan', location: 'Shelf A2' },
  { id: 'med-6', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Antacid', batchNo: 'OMP-2024-006', expiry: '2025-09-30', stock: 150, minStock: 50, price: 5, unit: 'capsule', supplier: 'Getz Pharma', location: 'Shelf A3' },
  { id: 'med-7', name: 'ORS Sachets', genericName: 'Oral Rehydration Salts', category: 'Rehydration', batchNo: 'ORS-2024-007', expiry: '2026-03-31', stock: 200, minStock: 50, price: 20, unit: 'sachet', supplier: 'Local Supplier', location: 'Shelf C1' },
  { id: 'med-8', name: 'Metronidazole 400mg', genericName: 'Metronidazole', category: 'Antibiotic', batchNo: 'MTZ-2024-008', expiry: '2025-07-15', stock: 60, minStock: 80, price: 6, unit: 'tablet', supplier: 'Searle', location: 'Shelf B2' },
  { id: 'med-9', name: 'Salbutamol Inhaler', genericName: 'Albuterol', category: 'Bronchodilator', batchNo: 'SAL-2024-009', expiry: '2025-11-30', stock: 30, minStock: 15, price: 250, unit: 'inhaler', supplier: 'GSK Pakistan', location: 'Shelf D1' },
  { id: 'med-10', name: 'Prednisolone 5mg', genericName: 'Prednisolone', category: 'Steroid', batchNo: 'PRD-2024-010', expiry: '2025-05-31', stock: 90, minStock: 40, price: 4, unit: 'tablet', supplier: 'Hoechst Pakistan', location: 'Shelf B3' },
  { id: 'med-11', name: 'Cetrimide Antiseptic', genericName: 'Cetrimide', category: 'Antiseptic', batchNo: 'CTR-2024-011', expiry: '2026-06-30', stock: 45, minStock: 20, price: 80, unit: 'bottle', supplier: 'Local Supplier', location: 'Shelf C2' },
  { id: 'med-12', name: 'Diazepam 5mg', genericName: 'Diazepam', category: 'Sedative', batchNo: 'DZP-2024-012', expiry: '2025-04-30', stock: 75, minStock: 30, price: 4, unit: 'tablet', supplier: 'Searle', location: 'Shelf B4 (Controlled)' },
  { id: 'med-13', name: 'Ringer Lactate IV', genericName: 'Compound Sodium Lactate', category: 'IV Fluid', batchNo: 'RLV-2024-013', expiry: '2025-12-31', stock: 120, minStock: 40, price: 120, unit: 'bag', supplier: 'Local Supplier', location: 'Store Room' },
  { id: 'med-14', name: 'Ferrous Sulphate 200mg', genericName: 'Ferrous Sulphate', category: 'Supplement', batchNo: 'FER-2024-014', expiry: '2026-02-28', stock: 180, minStock: 50, price: 2, unit: 'tablet', supplier: 'Getz Pharma', location: 'Shelf A4' },
  { id: 'med-15', name: 'Multivitamin Syrup', genericName: 'Multivitamin', category: 'Supplement', batchNo: 'MVT-2024-015', expiry: '2025-08-31', stock: 40, minStock: 25, price: 150, unit: 'bottle', supplier: 'Sami Pharma', location: 'Shelf A4' },
  { id: 'med-16', name: 'Diclofenac Gel 1%', genericName: 'Diclofenac', category: 'Topical NSAID', batchNo: 'DCF-2024-016', expiry: '2025-10-31', stock: 55, minStock: 20, price: 90, unit: 'tube', supplier: 'Novartis', location: 'Shelf C3' },
  { id: 'med-17', name: 'Loperamide 2mg', genericName: 'Loperamide', category: 'Antidiarrheal', batchNo: 'LOP-2024-017', expiry: '2025-07-31', stock: 25, minStock: 50, price: 3, unit: 'capsule', supplier: 'GSK Pakistan', location: 'Shelf A2' },
  { id: 'med-18', name: 'Chlorhexidine 0.05%', genericName: 'Chlorhexidine Gluconate', category: 'Antiseptic', batchNo: 'CHX-2024-018', expiry: '2026-04-30', stock: 60, minStock: 20, price: 60, unit: 'bottle', supplier: 'Local Supplier', location: 'Shelf C2' },
  { id: 'med-19', name: 'Insulin Regular 100IU/ml', genericName: 'Human Insulin', category: 'Antidiabetic', batchNo: 'INS-2024-019', expiry: '2025-03-31', stock: 20, minStock: 10, price: 550, unit: 'vial', supplier: 'Novo Nordisk', location: 'Refrigerator' },
  { id: 'med-20', name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'Antidiabetic', batchNo: 'MTF-2024-020', expiry: '2026-01-31', stock: 140, minStock: 50, price: 3, unit: 'tablet', supplier: 'Merck', location: 'Shelf A3' },
  { id: 'med-21', name: 'Tranexamic Acid 500mg', genericName: 'Tranexamic Acid', category: 'Antifibrinolytic', batchNo: 'TXA-2024-021', expiry: '2025-09-15', stock: 70, minStock: 30, price: 7, unit: 'tablet', supplier: 'Searle', location: 'Shelf B3' },
  { id: 'med-22', name: 'Vitamin D3 1000IU', genericName: 'Cholecalciferol', category: 'Supplement', batchNo: 'VTD-2024-022', expiry: '2026-05-31', stock: 220, minStock: 60, price: 5, unit: 'tablet', supplier: 'Getz Pharma', location: 'Shelf A4' },
  { id: 'med-23', name: 'Epinephrine Ampoule 1mg', genericName: 'Adrenaline', category: 'Emergency', batchNo: 'EPI-2024-023', expiry: '2025-06-30', stock: 15, minStock: 20, price: 45, unit: 'ampoule', supplier: 'Local Supplier', location: 'Emergency Trolley' },
  { id: 'med-24', name: 'Dexamethasone 4mg/ml', genericName: 'Dexamethasone', category: 'Steroid', batchNo: 'DEX-2024-024', expiry: '2025-11-30', stock: 50, minStock: 25, price: 15, unit: 'ampoule', supplier: 'Hoechst Pakistan', location: 'Shelf B3' },
];

function loadMedicines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore corrupt storage */ }
  return null;
}

// A synced copy (stock edited on any device) wins over the static catalog.
export const medicines = loadMedicines() || DEFAULT_MEDICINES;
registerList('medicines', medicines);

export function saveMedicines() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines)); } catch { /* ignore quota errors */ }
  schedulePush('medicines');
}

/** Permanently remove a medicine from inventory (synced to every device). */
export function removeMedicine(id) {
  const i = medicines.findIndex(m => m.id === id);
  if (i === -1) return false;
  medicines.splice(i, 1);
  saveMedicines();
  return true;
}

export const getMedicineById = (id) => medicines.find(m => m.id === id);
export const getLowStockMedicines = () => medicines.filter(m => m.stock < m.minStock);
export const getNearExpiryMedicines = (days = 60) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return medicines.filter(m => new Date(m.expiry) <= cutoff && new Date(m.expiry) >= now);
};
export const getExpiredMedicines = () => {
  const now = new Date();
  return medicines.filter(m => new Date(m.expiry) < now);
};
