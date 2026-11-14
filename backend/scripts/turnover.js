/**
 * Annual Entry turnover — backend-only CLI (no frontend changes).
 *
 *   Soft archive outgoing Entry : node scripts/turnover.js archive --from 5701 --to 57153
 *   Hard delete outgoing Entry  : node scripts/turnover.js delete --from 5701 --to 57153 --yes
 *   Add incoming Entry (CSV)    : node scripts/turnover.js add-entry --file data/new-entry.csv
 *
 * add-entry runs in ONE transaction: any bad row rolls back the whole import.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { pool, withTransaction } from '../db.js';
import { parseCadetCsv } from '../lib/csv.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function range() {
  const from = parseInt(arg('from') ?? '', 10);
  const to = parseInt(arg('to') ?? '', 10);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    console.error('Required: --from <int> --to <int>  (with from <= to)');
    process.exit(1);
  }
  return [from, to];
}

const [cmd] = process.argv.slice(2);

async function main() {
  if (cmd === 'archive') {
    const [from, to] = range();
    const r = await pool.query(
      "UPDATE cadets SET status = 'passed_out' WHERE kit_number BETWEEN $1 AND $2 AND status = 'active'",
      [from, to]
    );
    console.log(`Archived (status='passed_out'): ${r.rowCount} cadets in kit ${from}-${to}`);
    return;
  }

  if (cmd === 'delete') {
    if (!process.argv.includes('--yes')) {
      console.error('Hard delete requires --yes  (e.g. --from 5701 --to 57153 --yes)');
      process.exit(1);
    }
    const [from, to] = range();
    const r = await pool.query('DELETE FROM cadets WHERE kit_number BETWEEN $1 AND $2', [from, to]);
    console.log(`Deleted: ${r.rowCount} cadets in kit ${from}-${to}`);
    return;
  }

  if (cmd === 'add-entry') {
    const file = arg('file');
    if (!file || !fs.existsSync(file)) {
      console.error('Required: --file <path-to-csv>  (header: kit_number,name)');
      process.exit(1);
    }
    const { cadets, rejected } = parseCadetCsv(fs.readFileSync(file, 'utf8'));
    if (!cadets.length) {
      console.error('No valid rows found.');
      process.exit(1);
    }
    const upserted = await withTransaction(async (client) => {
      let n = 0;
      for (const c of cadets) {
        const r = await client.query(
          `INSERT INTO cadets (kit_number, name, house) VALUES ($1, $2, $3)
           ON CONFLICT (kit_number)
           DO UPDATE SET name = EXCLUDED.name,
                         house = COALESCE(EXCLUDED.house, cadets.house),
                         status = 'active'`,
          [c.kit_number, c.name, c.house ?? null]
        );
        if (r.rowCount) n += 1;
      }
      return n;
    });
    const kits = cadets.map(c => c.kit_number);
    console.log(`Entry added (1 ACID transaction): ${upserted} rows upserted`);
    console.log(`  kit range: ${Math.min(...kits)} - ${Math.max(...kits)}  | rejected: ${rejected.length}`);
    return;
  }

  console.error('Unknown command. Use: archive | delete | add-entry  (see header comment)');
  process.exit(1);
}

main()
  .catch(err => {
    console.error('FAILED (rolled back):', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
