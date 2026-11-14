import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

/**
 * ICD-10 style searchable diagnosis input with dropdown suggestions.
 */
export function ICDSearchInput({ value, onChange, diagnoses, error, id }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return diagnoses.filter(d =>
      d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, diagnoses]);

  const select = (d) => {
    onChange(d);
    setQuery('');
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) {
      e.preventDefault();
      select(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <label htmlFor={id} className="block text-sm font-medium text-primary-900 mb-1.5">
        Diagnosis (ICD-10) <span className="text-red-500">*</span>
      </label>

      {value ? (
        <div className={`flex items-center justify-between gap-2 border rounded-lg px-3.5 py-2.5 bg-primary-50 ${error ? 'border-red-500' : 'border-primary-200'}`}>
          <div className="min-w-0">
            <span className="text-xs font-mono font-bold text-primary-900">{value.code}</span>
            <p className="text-sm text-slate-800 truncate">{value.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-slate-400 hover:text-primary-900 shrink-0 text-lg leading-none"
            aria-label="Clear diagnosis"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id={id}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by ICD-10 code or diagnosis name…"
            className={`input pl-9 ${error ? 'input-error' : ''}`}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
          />
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>
      )}

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-primary-100 rounded-lg shadow-lg overflow-auto max-h-64" role="listbox">
          {filtered.map((d, i) => (
            <button
              key={d.code}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onClick={() => select(d)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3.5 py-2.5 border-b border-primary-50 last:border-b-0 transition-colors ${
                i === highlight ? 'bg-primary-50 text-primary-900' : 'hover:bg-primary-50/50'
              }`}
            >
              <span className="text-xs font-mono font-bold text-primary-900">{d.code}</span>
              <p className="text-sm text-slate-700">{d.name}</p>
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-primary-100 rounded-lg shadow-lg px-3.5 py-3 text-sm text-slate-500">
          No matching ICD-10 codes found.
        </div>
      )}
    </div>
  );
}
