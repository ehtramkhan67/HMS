import 'dotenv/config';
import express from 'express';
import { pool, withTransaction } from './db.js';
import { parseCadetCsv } from './lib/csv.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for the Vite dev server / LAN preview
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
app.use(express.json({ limit: '4mb' }));

const isKit = (v) => /^\d{3,6}$/.test(String(v ?? '').trim());
const isRange = (from, to) =>
  Number.isInteger(from) && Number.isInteger(to) && from <= to && from >= 0 && to <= 999999;

/* ---------------- Health ---------------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hms-cadet-directory' });
});

/* ---------------- 2. Fast lookup endpoint ---------------- */
// GET /api/cadets/:kit_number  ->  { kit_number, name }  (active cadets only)
app.get('/api/cadets/:kit_number', async (req, res) => {
  const kit = String(req.params.kit_number).trim();
  if (!isKit(kit)) {
    return res.status(400).json({ error: 'kit_number must be a 3-6 digit integer' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT kit_number, name, house FROM cadets WHERE kit_number = $1 AND status = $2',
      [Number(kit), 'active']
    );
    if (!rows.length) return res.status(404).json({ error: 'Cadet not found' });
    return res.json({
      kit_number: rows[0].kit_number,
      name: rows[0].name,
      house: rows[0].house || '',
    });
  } catch (err) {
    console.error('lookup failed:', err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

/* ---------------- Bulk import (ACID) ---------------- */
// POST /api/cadets/import   body: { csv: "kit_number,name\n..." }
app.post('/api/cadets/import', async (req, res) => {
  try {
    const { cadets, rejected } = parseCadetCsv(req.body?.csv);
    if (!cadets.length) return res.status(400).json({ error: 'No valid rows found' });
    const stats = await withTransaction(async (client) => {
      let inserted = 0;
      let updated = 0;
      for (const c of cadets) {
        const r = await client.query(
          `INSERT INTO cadets (kit_number, name, house)
           VALUES ($1, $2, $3)
           ON CONFLICT (kit_number)
           DO UPDATE SET name = EXCLUDED.name,
                         house = COALESCE(EXCLUDED.house, cadets.house),
                         status = 'active'`,
          [c.kit_number, c.name, c.house ?? null]
        );
        if (r.rowCount) updated += 1;
      }
      inserted = updated;
      return { upserted: inserted };
    });
    return res.json({ ...stats, total: cadets.length, rejected });
  } catch (err) {
    console.error('import failed:', err.message);
    return res.status(500).json({ error: err.message || 'Import failed' });
  }
});

/* ---------------- 4. Annual Entry turnover (backend-only) ---------------- */

// a1) Soft archive an outgoing Entry by kit range
// POST /api/turnover/archive  body: { from: 5701, to: 57153 }
app.post('/api/turnover/archive', async (req, res) => {
  const { from, to } = req.body ?? {};
  if (!isRange(from, to)) {
    return res.status(400).json({ error: 'from/to must be integers with from <= to' });
  }
  try {
    const r = await pool.query(
      "UPDATE cadets SET status = 'passed_out' WHERE kit_number BETWEEN $1 AND $2 AND status = 'active'",
      [from, to]
    );
    return res.json({ action: 'archived', range: [from, to], affected: r.rowCount });
  } catch (err) {
    console.error('archive failed:', err.message);
    return res.status(500).json({ error: 'Archive failed' });
  }
});

// a2) Hard delete an outgoing Entry by kit range
// POST /api/turnover/delete  body: { from, to, confirm: "DELETE" }
app.post('/api/turnover/delete', async (req, res) => {
  const { from, to, confirm } = req.body ?? {};
  if (!isRange(from, to)) {
    return res.status(400).json({ error: 'from/to must be integers with from <= to' });
  }
  if (confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Send confirm: "DELETE" to hard-delete a range' });
  }
  try {
    const r = await pool.query(
      'DELETE FROM cadets WHERE kit_number BETWEEN $1 AND $2',
      [from, to]
    );
    return res.json({ action: 'deleted', range: [from, to], affected: r.rowCount });
  } catch (err) {
    console.error('delete failed:', err.message);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

// b) Incoming Entry bulk add from CSV paste — single ACID transaction
// POST /api/turnover/add-entry  body: { csv: "kit_number,name\n..." }
app.post('/api/turnover/add-entry', async (req, res) => {
  try {
    const { cadets, rejected } = parseCadetCsv(req.body?.csv);
    if (!cadets.length) return res.status(400).json({ error: 'No valid rows found' });
    const stats = await withTransaction(async (client) => {
      for (const c of cadets) {
        await client.query(
          `INSERT INTO cadets (kit_number, name, house)
           VALUES ($1, $2, $3)
           ON CONFLICT (kit_number)
           DO UPDATE SET name = EXCLUDED.name,
                         house = COALESCE(EXCLUDED.house, cadets.house),
                         status = 'active'`,
          [c.kit_number, c.name, c.house ?? null]
        );
      }
      return { upserted: cadets.length };
    });
    const kits = cadets.map(c => c.kit_number);
    return res.json({
      action: 'entry-added',
      ...stats,
      kit_range: [Math.min(...kits), Math.max(...kits)],
      rejected,
    });
  } catch (err) {
    console.error('add-entry failed:', err.message); // transaction already rolled back
    return res.status(500).json({ error: err.message || 'Entry import failed' });
  }
});

/* ---------------- 5. Record sync store ----------------
 * The frontend persists every user-entered collection (visits, queue,
 * admissions, beds, prescriptions, lab orders, slips, medicines, ...)
 * here as JSON documents, so the same data is visible on every device.
 *
 * Wire format: { records: [{ id: "<record id>", data: {...} }, ...] }
 * A PUT replaces the whole collection (matches localStorage semantics).
 */

// Only these collections may be written — rejects stray/malformed names.
const RECORD_COLLECTIONS = new Set([
  'visits',
  'queue',
  'admissions',
  'bedState',
  'labOrders',
  'prescriptions',
  'restDutySlips',
  'fitnessCertificates',
  'admissionMedicals',
  'annualMedical',
  'activities',
  'registeredCadets',
  'userOverrides',
  'medicines',
  'dispenseLog',
]);

const MAX_RECORDS_PER_COLLECTION = 10000;

const isKnownCollection = (name) =>
  typeof name === 'string' && RECORD_COLLECTIONS.has(name);

// GET /api/records — every collection in one round trip (app boot)
app.get('/api/records', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT collection, id, data FROM records'
    );
    const out = {};
    for (const name of RECORD_COLLECTIONS) out[name] = [];
    for (const row of rows) {
      if (out[row.collection]) out[row.collection].push({ id: row.id, data: row.data });
    }
    return res.json(out);
  } catch (err) {
    console.error('records list failed:', err.message);
    return res.status(500).json({ error: 'Failed to load records' });
  }
});

// GET /api/records/:collection — one collection
app.get('/api/records/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!isKnownCollection(collection)) {
    return res.status(404).json({ error: 'Unknown collection' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, data FROM records WHERE collection = $1 ORDER BY id',
      [collection]
    );
    return res.json(rows.map(r => ({ id: r.id, data: r.data })));
  } catch (err) {
    console.error(`records get ${collection} failed:`, err.message);
    return res.status(500).json({ error: 'Failed to load collection' });
  }
});

// PUT /api/records/:collection — replace the whole collection atomically
app.put('/api/records/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!isKnownCollection(collection)) {
    return res.status(404).json({ error: 'Unknown collection' });
  }
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Body must be { records: [...] }' });
  }
  if (records.length > MAX_RECORDS_PER_COLLECTION) {
    return res.status(413).json({ error: 'Too many records' });
  }
  const valid = [];
  for (const rec of records) {
    if (!rec || typeof rec !== 'object' || typeof rec.id !== 'string' || !rec.id) {
      return res.status(400).json({ error: 'Every record needs a string id' });
    }
    // Accept both wire shapes: { id, data } and a bare record that
    // carries its own id (stored as-is).
    valid.push({ id: rec.id, data: rec.data !== undefined ? rec.data : rec });
  }
  try {
    const count = await withTransaction(async (client) => {
      await client.query('DELETE FROM records WHERE collection = $1', [collection]);
      for (const rec of valid) {
        await client.query(
          `INSERT INTO records (collection, id, data)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (collection, id)
           DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [collection, rec.id, JSON.stringify(rec.data ?? null)]
        );
      }
      return valid.length;
    });
    return res.json({ ok: true, collection, count });
  } catch (err) {
    console.error(`records put ${collection} failed:`, err.message);
    return res.status(500).json({ error: 'Failed to save collection' });
  }
});

// DELETE /api/records/:collection/:id — remove a single record
app.delete('/api/records/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!isKnownCollection(collection)) {
    return res.status(404).json({ error: 'Unknown collection' });
  }
  try {
    const r = await pool.query(
      'DELETE FROM records WHERE collection = $1 AND id = $2',
      [collection, id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Record not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('record delete failed:', err.message);
    return res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.listen(PORT, () => {
  console.log(`HMS cadet directory API listening on http://localhost:${PORT}`);
  console.log('  GET  /api/cadets/:kit_number');
  console.log('  GET  /api/records | /api/records/:collection');
  console.log('  PUT  /api/records/:collection   DELETE /api/records/:collection/:id');
  console.log('  POST /api/cadets/import | /api/turnover/{archive,delete,add-entry}');
});
