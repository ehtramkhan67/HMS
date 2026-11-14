import 'dotenv/config';
import pg from 'pg';

// Uses DATABASE_URL when set, otherwise standard PG* env vars
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE).
export const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : new pg.Pool({ max: 10 });

/** Runs fn inside a dedicated client with BEGIN/COMMIT/ROLLBACK (ACID). */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
