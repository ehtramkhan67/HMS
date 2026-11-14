# HMS PostgreSQL Backend (cadet directory)

Standalone API for the Cadet College Kohat Hospital Management System.
**The frontend is untouched visually** — it only calls `GET /api/cadets/:kit_number`
and falls back to the bundled store (`src/data/cadetDirectory.json`, 557 cadets)
when this server is offline.

## Setup

```powershell
cd backend
copy .env.example .env        # edit DATABASE_URL
npm install
npm run db:init               # apply schema.sql (cadets table + indexes + trigger)
npm run db:import             # bulk import data/cadets.sql content via data/cadets.csv (ACID)
npm start                     # API on http://localhost:3001
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cadets/:kit_number` | Fast lookup → `{ kit_number, name }` (active cadets only, 404 otherwise) |
| POST | `/api/cadets/import` | Bulk upsert from `{ csv }` (ACID) |
| POST | `/api/turnover/archive` | Soft archive outgoing Entry `{ from, to }` → `status='passed_out'` |
| POST | `/api/turnover/delete` | Hard delete `{ from, to, confirm:"DELETE" }` |
| POST | `/api/turnover/add-entry` | Incoming Entry from `{ csv }` — single ACID transaction |
| GET | `/api/health` | Health check |

## Annual Entry turnover (CLI)

```powershell
# a) Outgoing Entry (~120 cadets) by kit range
node scripts/turnover.js archive --from 5701 --to 57153     # soft archive
node scripts/turnover.js delete  --from 5701 --to 57153 --yes  # hard delete

# b) Incoming Entry (~120 cadets) from CSV (header: kit_number,name)
node scripts/turnover.js add-entry --file data/new-entry.csv
```

## One-time SQL alternative

```powershell
psql "$DATABASE_URL" -f data/cadets.sql     # 557 idempotent INSERT ... ON CONFLICT upserts
```

## Data

- `data/cadets.csv` + `data/cadets.sql` — 557 unique cadets, 5 Entries
  (kit prefixes 57/58/59/60/61), generated from `All Result 2025-26 (62 Entry).xls`.
- Import is idempotent: re-running upserts name and resets `status='active'`.
