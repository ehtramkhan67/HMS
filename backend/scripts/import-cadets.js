/**
 * Bulk-import cadets from CSV (default: data/cadets.csv — the 5-Entry sheet).
 * All-or-nothing: runs inside ONE transaction (ACID).
 *
 *   npm run db:import
 *   node scripts/import-cadets.js --file path/to/other.csv
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../db.js';
import { parseCadetCsv } from '../lib/csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileArg = process.argv.indexOf('--file');
const file = fileArg !== -1
  ? process.argv[fileArg + 1]
  : path.join(__dirname, '..', 'data', 'cadets.csv');

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const { cadets, rejected } = parseCadetCsv(fs.readFileSync(file, 'utf8'));
if (!cadets.length) {
  console.error('No valid rows to import.');
  process.exit(1);
}

const UPSERT = `INSERT INTO cadets (kit_number, name, house)
  VALUES ($1, $2, $3)
  ON CONFLICT (kit_number)
  DO UPDATE SET name = EXCLUDED.name,
                house = COALESCE(EXCLUDED.house, cadets.house),
                status = 'active'`;

try {
  const result = await withTransaction(async (client) => {
    let upserted = 0;
    for (const c of cadets) {
      const r = await client.query(UPSERT, [c.kit_number, c.name, c.house ?? null]);
      if (r.rowCount) upserted += 1;
    }
    return upserted;
  });
  const kits = cadets.map(c => c.kit_number);
  console.log(`Import OK (1 transaction): ${result} rows upserted`);
  console.log(`  kit range: ${Math.min(...kits)} - ${Math.max(...kits)}`);
  console.log(`  rejected : ${rejected.length}`);
  if (rejected.length) console.log('  ', rejected.slice(0, 5));
} catch (err) {
  console.error('Import FAILED — transaction rolled back:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
