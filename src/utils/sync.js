// Cross-device sync layer -------------------------------------------------
//
// Every data module in src/data/* persists to localStorage (fast + works
// offline). This module mirrors each collection to the PostgreSQL backend
// so the same records appear on every laptop:
//
//   * hydrate()           — runs ONCE at boot, BEFORE the app modules are
//                           imported (see src/main.jsx). Pulls every
//                           collection from the API, merges it with local
//                           data and writes the result back to
//                           localStorage, so the modules' load-time reads
//                           pick up the server state. Also migrates any
//                           pre-sync localStorage data into the DB.
//   * schedulePush(name)  — called by every save*() in src/data/*. Marks
//                           the collection dirty immediately (survives a
//                           closed tab), then pushes after a short debounce.
//                           Failed pushes stay dirty and win the merge on
//                           the next boot, so offline edits are never lost.
//
// localStorage remains a fast offline cache; the server is authoritative
// for everything except collections with unsynced (dirty) local edits.
//
// Auto-refresh: startAutoRefresh(30000) re-runs hydrate() every 30 s,
// applies changed records to the modules' in-memory arrays (registry
// below) and notifies subscribed pages via useSyncRefresh() so the UI
// updates live — no manual reload needed.

import { useRef, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const DIRTY_KEY = 'cchms_sync_dirty_v1';
// Set after the first successful hydrate: legacy localStorage data has
// been pushed to the DB by then, so from then on a clean collection is
// exactly the server state (records missing there were deleted on
// another device and must not be re-uploaded).
const MIGRATED_KEY = 'cchms_sync_migrated_v1';

/**
 * name  → collection name on the server (must match the backend whitelist)
 * key   → localStorage key owned by the data module
 * mode  → 'list' = array of records that each have an `id`
 *         'map'  = a single object keyed by bed id / user id
 */
export const COLLECTIONS = [
  { name: 'visits', key: 'cchms_user_visits_v1', mode: 'list' },
  { name: 'queue', key: 'cchms_opd_queue_v1', mode: 'list' },
  { name: 'admissions', key: 'cchms_admissions_v1', mode: 'list' },
  { name: 'bedState', key: 'cchms_bed_state_v1', mode: 'map' },
  { name: 'labOrders', key: 'cchms_lab_orders_v1', mode: 'list' },
  { name: 'prescriptions', key: 'cchms_prescriptions_v1', mode: 'list' },
  { name: 'restDutySlips', key: 'cchms_rest_duty_slips_v1', mode: 'list' },
  { name: 'fitnessCertificates', key: 'cchms_fitness_certs_v1', mode: 'list' },
  { name: 'admissionMedicals', key: 'cchms_admission_medicals_v1', mode: 'list' },
  { name: 'annualMedical', key: 'cchms_annual_medical_v1', mode: 'list' },
  { name: 'activities', key: 'cchms_activities_v1', mode: 'list' },
  { name: 'registeredCadets', key: 'cchms_registered_cadets_v1', mode: 'list' },
  { name: 'userOverrides', key: 'cchms_user_overrides_v1', mode: 'map' },
  { name: 'medicines', key: 'cchms_medicines_v1', mode: 'list' },
  { name: 'dispenseLog', key: 'cchms_dispense_log_v1', mode: 'list' },
];

const byName = new Map(COLLECTIONS.map(c => [c.name, c]));

// ── in-memory registry (populated by src/data/* at load time) ──
// Pages read records through the data modules' exported arrays, so a
// background refresh must update those arrays in place — writing only
// localStorage would leave every open page showing stale state.
const registry = new Map(); // name -> { arr } | { apply }

/** Register a plain record array (merged in place by id on refresh). */
export function registerList(name, arr) {
  registry.set(name, { arr });
}

/** Register a custom applier — used by the map-shaped collections.
 *  `source` is the object the module owns so hydrate can detect when
 *  another tab changed it behind this tab's back. */
export function registerMap(name, source, apply) {
  registry.set(name, { source, apply });
}

/** JSON of the registered in-memory state, or null when not registered. */
function memoryJson(col) {
  const reg = registry.get(col.name);
  if (!reg) return null;
  try {
    if (reg.source) return JSON.stringify(reg.source);
    if (reg.arr) return JSON.stringify(reg.arr);
  } catch { /* circular / huge — ignore */ }
  return null;
}

function applyToMemory(col, merged) {
  const reg = registry.get(col.name);
  if (!reg) return;
  if (reg.apply) { reg.apply(merged); return; }
  // Id-preserving merge: shared records are updated in place so open
  // modals/details keep their object identity; the array contents then
  // exactly mirror the merged server state (adds, updates, deletions).
  const arr = reg.arr;
  const byId = new Map();
  for (const r of arr) if (r && r.id != null) byId.set(String(r.id), r);
  const next = merged.map(m => {
    if (!m || m.id == null) return m;
    const existing = byId.get(String(m.id));
    if (!existing) return m;
    // Replace contents key-for-key in the merged order so the in-memory
    // JSON matches `merged` exactly (avoids a false "changed" every poll).
    for (const k of Object.keys(existing)) delete existing[k];
    Object.assign(existing, m);
    return existing;
  });
  arr.length = 0;
  for (const r of next) arr.push(r);
}

// ── refresh listeners (pages subscribe via useSyncRefresh) ──────
const syncListeners = new Set();

/** Subscribe to background refreshes that changed data. Returns unsubscribe. */
export function onSyncRefresh(cb) {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}

function notifyListeners(changed) {
  for (const cb of [...syncListeners]) {
    try { cb(changed); } catch (err) { console.warn('[sync] listener failed:', err); }
  }
}

/**
 * React hook: re-run `load` (called with silent=true so pages don't
 * flash their loading skeletons) whenever a background refresh brings
 * in new data. The latest `load` closure is always used.
 */
export function useSyncRefresh(load) {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => onSyncRefresh(() => {
    try { ref.current?.(true); } catch (err) { console.warn('[sync] reload failed:', err); }
  }), []);
}

// ── helpers ─────────────────────────────────────────────────────

function parseRaw(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function readLocal(col) {
  return parseRaw(localStorage.getItem(col.key));
}

function writeLocal(col, value) {
  try { localStorage.setItem(col.key, JSON.stringify(value)); } catch { /* quota */ }
}

// Collections whose last push failed. Kept in localStorage so an edit
// made right before the tab closed still wins the merge next boot.
let dirtySet = null;
function dirty() {
  if (!dirtySet) dirtySet = new Set(parseRaw(localStorage.getItem(DIRTY_KEY)) || []);
  return dirtySet;
}
function persistDirty() {
  try { localStorage.setItem(DIRTY_KEY, JSON.stringify([...dirty()])); } catch { /* quota */ }
}

// localStorage value → wire format [{ id, data }]
function toRows(col, value) {
  if (col.mode === 'map') {
    return [{ id: 'state', data: value }];
  }
  const rows = [];
  for (const rec of value) {
    if (rec && rec.id != null) rows.push({ id: String(rec.id), data: rec });
    else console.warn(`[sync] ${col.name}: record without id skipped`, rec);
  }
  return rows;
}

// wire format → localStorage value
function fromRows(col, rows) {
  if (col.mode === 'map') {
    const state = rows.find(r => r.id === 'state');
    return state && state.data && typeof state.data === 'object' ? state.data : {};
  }
  return rows.map(r => r.data).filter(d => d && typeof d === 'object');
}

async function pushRows(col, rows, signal) {
  const res = await fetch(`${API_BASE}/api/records/${col.name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: rows }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

// Push one collection now; update the dirty flag on success/failure.
// pushTimes records when each collection last landed on the server so
// hydrate can detect a server snapshot that went stale mid-flight.
const pushTimes = new Map();

async function pushCollection(col, rows) {
  try {
    await pushRows(col, rows);
    pushTimes.set(col.name, Date.now());
    if (dirty().delete(col.name)) persistDirty();
    return true;
  } catch (err) {
    console.warn(`[sync] push "${col.name}" failed:`, err.message || err);
    dirty().add(col.name);
    persistDirty();
    return false;
  }
}

// ── debounced push (called by every save*()) ────────────────────

const pending = new Set();
let flushTimer = null;

/** Queue a collection for upload. Marks it dirty synchronously. */
export function schedulePush(name) {
  if (!byName.has(name)) return;
  dirty().add(name);
  persistDirty();
  pending.add(name);
  if (flushTimer == null) flushTimer = setTimeout(flush, 400);
}

async function flush() {
  flushTimer = null;
  const names = [...pending];
  pending.clear();
  for (const name of names) {
    const col = byName.get(name);
    const local = readLocal(col);
    if (local === null) continue; // nothing stored yet — nothing to push
    await pushCollection(col, toRows(col, local));
  }
  // A save arrived while we were flushing — queue another round.
  if (pending.size && flushTimer == null) flushTimer = setTimeout(flush, 400);
}

/** Push everything still pending immediately (used on page unload). */
export function flushSync() {
  if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
  if (!pending.size) return;
  // keepalive lets the request outlive the page; dirty flags already
  // protect the data if the request still doesn't make it.
  const names = [...pending];
  pending.clear();
  for (const name of names) {
    const col = byName.get(name);
    const local = readLocal(col);
    if (local === null) continue;
    try {
      fetch(`${API_BASE}/api/records/${col.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: toRows(col, local) }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* best effort */ }
  }
}

// ── boot-time hydration ─────────────────────────────────────────

function mergeList(col, localList, serverList, isDirty, migration) {
  const serverById = new Map(serverList.map(r => [String(r.id), r]));

  // Once migration is done, a clean collection is server-exact: any
  // local record the server no longer has was deleted on another
  // device — drop it (and never push it back, or it would resurrect).
  if (!isDirty && !migration) {
    const merged = [...serverList];
    // Records without an id can never sync — keep them on this device.
    for (const rec of localList) if (!rec || rec.id == null) merged.push(rec);
    return { merged, needsPush: false };
  }

  const merged = [];
  const seen = new Set();

  // Local order first; the server only wins for shared records when this
  // collection has no unsynced local edits.
  for (const rec of localList) {
    const id = rec && rec.id != null ? String(rec.id) : null;
    if (!id) { merged.push(rec); continue; }
    const srv = serverById.get(id);
    merged.push(srv && !isDirty ? srv : rec);
    seen.add(id);
  }
  // Records that only exist on the server (made on another laptop).
  // Skipped when local is dirty AND empty — an empty dirty list is an
  // intentional clear (e.g. "reset annual medical data").
  if (!isDirty || localList.length > 0) {
    for (const srv of serverList) {
      const id = String(srv.id);
      if (!seen.has(id)) { merged.push(srv); seen.add(id); }
    }
  }

  const needsPush =
    // local record changed / added vs server
    merged.some(rec => {
      if (!rec || rec.id == null) return false;
      const srv = serverById.get(String(rec.id));
      return !srv || JSON.stringify(srv) !== JSON.stringify(rec);
    }) ||
    // a server record was deleted locally
    serverList.some(srv => !seen.has(String(srv.id)));

  return { merged, needsPush };
}

function mergeMap(col, localMap, serverMap, isDirty, migration) {
  // Clean + migrated → server state wins wholesale (see mergeList).
  if (!isDirty && !migration) return { merged: { ...serverMap }, needsPush: false };
  const merged = {};
  const keys = new Set([...Object.keys(localMap), ...Object.keys(serverMap)]);
  for (const k of keys) {
    if (isDirty && k in localMap) merged[k] = localMap[k];
    else if (k in serverMap) merged[k] = serverMap[k];
    else merged[k] = localMap[k];
  }
  const needsPush = JSON.stringify(merged) !== JSON.stringify(serverMap);
  return { merged, needsPush };
}

/**
 * Pull every collection from the API, merge with local data, write the
 * result to localStorage and mirror it into the registered in-memory
 * arrays. Must run before the data modules are imported at boot (the
 * registry is simply empty then). Never throws — offline boots fall back
 * to localStorage.
 *
 * @param {boolean} notify  notify subscribed pages when data changed
 *                          (used by the background auto-refresh).
 * @returns {Promise<string[]>} names of collections that changed.
 */
export async function hydrate({ notify = false } = {}) {
  let server;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${API_BASE}/api/records`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    server = await res.json();
  } catch (err) {
    console.warn('[sync] hydrate skipped (offline or API down):', err.message || err);
    return [];
  }

  const changed = [];
  // First hydrate after this feature ships: localStorage may still hold
  // pre-sync data — merge it in (and push it up) before switching to
  // strict server-authoritative merges.
  const migration = localStorage.getItem(MIGRATED_KEY) !== '1';
  // Snapshot taken before the GET: a push that lands after this moment
  // makes the server response stale for that collection, so it must be
  // treated as dirty (local wins) until the next refresh.
  const fetchedAt = Date.now();

  for (const col of COLLECTIONS) {
    try {
      const rows = Array.isArray(server[col.name]) ? server[col.name] : [];
      const local = readLocal(col);
      const isDirty = dirty().has(col.name) || (pushTimes.get(col.name) || 0) > fetchedAt;
      const localJson = JSON.stringify(local);
      let merged = null;
      let needsPush = false;

      if (col.mode === 'map') {
        const serverMap = fromRows(col, rows);
        const localMap = local && typeof local === 'object' && !Array.isArray(local) ? local : {};
        if (local === null && Object.keys(serverMap).length === 0) continue;
        const m = mergeMap(col, localMap, serverMap, isDirty, migration);
        merged = m.merged;
        needsPush = m.needsPush;
      } else {
        const serverList = fromRows(col, rows);
        const localList = Array.isArray(local) ? local : null;
        // Nothing on either side yet (e.g. medicines still on the static
        // catalog) — leave localStorage untouched.
        if (localList === null && serverList.length === 0) continue;
        const m = mergeList(col, localList ?? [], serverList, isDirty, migration);
        merged = m.merged;
        needsPush = m.needsPush;
      }

      // Write + notify when either the persisted copy or the in-memory
      // array the open pages read has drifted from the merged state —
      // another tab in this browser may have changed localStorage
      // without this tab's modules ever seeing it.
      const mergedJson = JSON.stringify(merged);
      const memJson = memoryJson(col);
      if (localJson !== mergedJson || (memJson !== null && memJson !== mergedJson)) {
        writeLocal(col, merged);
        applyToMemory(col, merged);
        changed.push(col.name);
      }
      // Local-only edits (migration / failed push / dirty window) go up.
      // A failed push keeps the collection dirty, so the data survives
      // even if we mark the migration complete right after this loop.
      if (needsPush) await pushCollection(col, toRows(col, merged));
    } catch (err) {
      console.warn(`[sync] hydrate "${col.name}" failed:`, err.message || err);
    }
  }

  if (migration) {
    try { localStorage.setItem(MIGRATED_KEY, '1'); } catch { /* quota */ }
  }

  if (changed.length) console.info(`[sync] refreshed: ${changed.join(', ')}`);
  if (notify && changed.length) notifyListeners(changed);
  return changed;
}

// ── 30-second live auto-refresh ─────────────────────────────────

let refreshing = false;

/** Re-pull the server state and push changes into the open UI. */
export async function refreshFromServer() {
  if (refreshing) return [];
  refreshing = true;
  try {
    return await hydrate({ notify: true });
  } finally {
    refreshing = false;
  }
}

let autoTimer = null;

/**
 * Start polling the backend every `intervalMs` (default 30 s) while the
 * tab is visible, plus an immediate catch-up when the tab regains focus,
 * so records entered on another laptop appear on their own.
 */
export function startAutoRefresh(intervalMs = 30000) {
  if (autoTimer != null) return;
  autoTimer = setInterval(() => {
    if (document.hidden) return; // background tabs sync on refocus instead
    refreshFromServer();
  }, intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromServer();
  });
}
