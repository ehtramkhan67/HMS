/**
 * Cadet directory lookup layer (data-fetching only — no UI).
 *
 * 1) Tries the PostgreSQL-backed API:  GET {VITE_API_URL}/api/cadets/:kit_number
 * 2) Falls back to the preloaded store bundled from the spreadsheet
 *    (src/data/cadetDirectory.json — 557 cadets across 5 Entries).
 *
 * Results (incl. misses) are cached in memory so each kit is fetched at most once.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const KIT_RE = /^\d{3,6}$/;

const cache = new Map();
let storePromise = null;

function loadStore() {
  if (!storePromise) {
    storePromise = import('../data/cadetDirectory.json')
      .then(mod => mod.default)
      .catch(() => ({}));
  }
  return storePromise;
}

/**
 * @param {string|number} rawKit kit number as typed (3-6 digits)
 * @returns {Promise<{kitNumber: string, name: string}|null>}
 */
export async function lookupCadetByKit(rawKit) {
  const kit = String(rawKit ?? '').trim();
  if (!KIT_RE.test(kit)) return null;
  if (cache.has(kit)) return cache.get(kit);

  // --- 1) live PostgreSQL API ---
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${API_BASE}/api/cadets/${kit}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.name) {
        const hit = { kitNumber: String(data.kit_number), name: data.name, house: data.house || '' };
        cache.set(kit, hit);
        return hit;
      }
    }
    if (res.status === 404) {
      cache.set(kit, null); // server reachable: definitive miss
      return null;
    }
  } catch {
    /* backend offline → fall through to preloaded store */
  }

  // --- 2) preloaded store fallback ---
  try {
    const store = await loadStore();
    const entry = store[kit];
    const hit = entry ? { kitNumber: kit, name: entry.name, house: entry.house || '' } : null;
    cache.set(kit, hit);
    return hit;
  } catch {
    return null;
  }
}

export default lookupCadetByKit;
