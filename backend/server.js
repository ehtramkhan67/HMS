import 'dotenv/config';
import express from 'express';
import { pool, withTransaction } from './db.js';
import { parseCadetCsv } from './lib/csv.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for the Vite dev server / LAN preview
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

app.listen(PORT, () => {
  console.log(`HMS cadet directory API listening on http://localhost:${PORT}`);
  console.log('  GET  /api/cadets/:kit_number');
  console.log('  POST /api/cadets/import | /api/turnover/{archive,delete,add-entry}');
});
