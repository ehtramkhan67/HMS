/** Minimal RFC-4180-style CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cur += '"'; i += 1; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch === '\r') { /* skip */ }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function titleCase(name) {
  const n = String(name).replace(/\s+/g, ' ').trim();
  const isAllLower = n === n.toLowerCase();
  const isAllUpper = n === n.toUpperCase() && /[A-Z]/.test(n);
  if (!isAllLower && !isAllUpper) return n;
  return n.toLowerCase().split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Parses cadet CSV with header `kit_number,name` (extra columns ignored).
 * Returns [{ kit_number, name }]; rows with invalid kit/name are rejected.
 */
export function parseCadetCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { cadets: [], rejected: [] };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const kitIdx = header.findIndex(h => h.startsWith('kit'));
  const nameIdx = header.findIndex(h => h.startsWith('name'));
  const houseIdx = header.findIndex(h => h.startsWith('house') || h.startsWith('hos'));
  if (kitIdx === -1 || nameIdx === -1) {
    throw new Error('CSV must have a header row containing "kit_number" and "name" columns');
  }

  // House code -> full name (J and Jnr are distinct; "Jr." is normalized to Junior).
  // Already-full values (e.g. "Jinnah House") pass through unchanged.
  const HOUSE_MAP = {
    j: 'Jinnah', k: 'Khushal', i: 'Iqbal', a: 'Ayub',
    m: 'Munawar', r: 'Rustam', jr: 'Junior', jnr: 'Junior',
  };
  const normalizeHouse = (raw) => {
    const code = String(raw).trim().replace(/\.+$/, '').trim();
    if (!code) return null;
    return HOUSE_MAP[code.toLowerCase()] || String(raw).trim();
  };
  const cadets = [];
  const rejected = [];
  for (let i = 1; i < rows.length; i += 1) {
    const kit = parseInt(String(rows[i][kitIdx] ?? '').trim(), 10);
    const name = titleCase(rows[i][nameIdx] ?? '');
    if (!Number.isInteger(kit) || kit < 100 || kit > 999999 || !name) {
      rejected.push({ line: i + 1, raw: rows[i].join(',') });
      continue;
    }
    if (name.length > 150) {
      rejected.push({ line: i + 1, raw: 'name exceeds 150 chars' });
      continue;
    }
    const house = houseIdx !== -1 ? normalizeHouse(rows[i][houseIdx]) : null;
    cadets.push({ kit_number: kit, name, house });
  }
  return { cadets, rejected };
}
