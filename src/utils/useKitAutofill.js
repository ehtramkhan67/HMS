import { useEffect, useRef } from 'react';
import { lookupCadetByKit } from './cadetDirectory';

/**
 * Kit-number autofill — the same behaviour in every portal:
 * type a valid kit (3–6 digits) and, after a short pause, the cadet's
 * name and house are filled into their boxes from the cadet directory
 * (live API → bundled 557-cadet store fallback).
 *
 * Rules (mirrors the Consultation / Annual Medical flow):
 *  - never overwrites a manually typed value
 *  - when the kit is erased/invalid, clears only the values it filled
 *  - failed lookups leave the boxes untouched
 *
 * Implementation notes: all bookkeeping happens OUTSIDE the state
 * updater. React runs updaters lazily and StrictMode double-invokes
 * them, so refs must not be written inside `setForm(prev => …)`.
 *
 * @param {object} form                the form state object (must contain the kit field)
 * @param {Function} setForm           functional state setter for the form
 * @param {{kitKey?: string, nameKey?: string, houseKey?: string}} keys  field keys
 */
export function useKitAutofill(form, setForm, { kitKey = 'kitNumber', nameKey = 'name', houseKey = 'houseName' } = {}) {
  const filledRef = useRef({ name: '', house: '' });
  const formRef = useRef(form);

  // Latest-form snapshot for the async decision (runs after every
  // commit, before the kit effect below, so it is always fresh).
  useEffect(() => { formRef.current = form; });

  const kit = String(form?.[kitKey] ?? '').trim();

  useEffect(() => {
    // Kit erased / not a valid kit number → undo our autofill only.
    // Refs are cleared BEFORE the dispatch; the updater only uses the
    // captured locals, so StrictMode's double-invoke is harmless.
    if (!/^\d{3,6}$/.test(kit)) {
      const { name, house } = filledRef.current;
      if (!name && !house) return undefined;
      filledRef.current = { name: '', house: '' };
      setForm(prev => {
        const next = { ...prev };
        let changed = false;
        if (name && prev[nameKey] === name) {
          next[nameKey] = '';
          changed = true;
        }
        if (house && prev[houseKey] === house) {
          next[houseKey] = '';
          changed = true;
        }
        return changed ? next : prev;
      });
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const hit = await lookupCadetByKit(kit);
        if (!hit || cancelled) return;
        // Decide from the latest committed form, record what we fill,
        // then apply — the updater re-checks in case the user typed
        // between snapshot and dispatch.
        const cur = formRef.current || {};
        const nameFree = !String(cur[nameKey] || '').trim()
          || cur[nameKey] === filledRef.current.name;
        const houseFree = !String(cur[houseKey] || '').trim()
          || cur[houseKey] === filledRef.current.house;
        const fillName = nameFree ? (hit.name || '') : '';
        const fillHouse = (houseFree && hit.house) ? hit.house : '';
        if (!fillName && !fillHouse) return;
        if (fillName) filledRef.current.name = fillName;
        if (fillHouse) filledRef.current.house = fillHouse;
        setForm(prev => {
          const next = { ...prev };
          let changed = false;
          if (fillName
            && (!String(prev[nameKey] || '').trim() || prev[nameKey] === filledRef.current.name)) {
            next[nameKey] = fillName;
            changed = true;
          }
          if (fillHouse
            && (!String(prev[houseKey] || '').trim() || prev[houseKey] === filledRef.current.house)) {
            next[houseKey] = fillHouse;
            changed = true;
          }
          return changed ? next : prev;
        });
      } catch {
        /* lookup failed — keep whatever is in the boxes */
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [kit, setForm, kitKey, nameKey, houseKey]);
}

export default useKitAutofill;
