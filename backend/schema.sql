-- ============================================================
-- Cadet College Kohat HMS — PostgreSQL schema
-- Apply:  npm run db:init      (or: psql "$DATABASE_URL" -f schema.sql)
-- ============================================================

-- Cadet directory (one row per cadet, keyed by unique kit number)
CREATE TABLE IF NOT EXISTS cadets (
  id          SERIAL PRIMARY KEY,
  -- UNIQUE constraint automatically creates a B-tree index
  -- (cadets_kit_number_key): O(1) point lookup by kit_number +
  -- efficient range scans (BETWEEN ... AND ...) for Entry turnover.
  kit_number  INTEGER UNIQUE NOT NULL,
  name        VARCHAR(150) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'passed_out')),
  -- Full house name: Jinnah / Khushal / Iqbal / Ayub / Munawar / Rustam / Junior
  house       VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing databases: add the house column if missing
ALTER TABLE cadets ADD COLUMN IF NOT EXISTS house VARCHAR(60);

-- Explicit lookup index (idempotent; no-op if UNIQUE already covers it,
-- kept so the plan is guaranteed even if the constraint is altered later).
CREATE INDEX IF NOT EXISTS idx_cadets_kit_number ON cadets (kit_number);

-- Turnover scans are always status + range filtered.
CREATE INDEX IF NOT EXISTS idx_cadets_status ON cadets (status);

-- updated_at maintained automatically on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cadets_updated_at ON cadets;
CREATE TRIGGER cadets_updated_at
  BEFORE UPDATE ON cadets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Fresh tables have no planner statistics — make the kit_number
-- unique index the guaranteed choice for point lookups.
ANALYZE cadets;

-- ============================================================
-- Sync store — one generic JSON document table for every app
-- collection the frontend persists (visits, queue, prescriptions,
-- admissions, beds, lab orders, slips, medicines, ...).
--
-- Each frontend collection is a set of rows keyed by
-- (collection, id); `data` holds the record as JSONB exactly as
-- the browser stored it, so the client can hydrate straight from
-- it without any column mapping.
-- ============================================================
CREATE TABLE IF NOT EXISTS records (
  collection TEXT        NOT NULL,   -- e.g. 'visits', 'prescriptions'
  id         TEXT        NOT NULL,   -- record id from the app
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

-- Collection scans (GET /api/records/:collection) are always
-- filtered by collection first.
CREATE INDEX IF NOT EXISTS idx_records_collection ON records (collection);

-- Keep updated_at current on every upsert.
DROP TRIGGER IF EXISTS records_updated_at ON records;
CREATE TRIGGER records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
