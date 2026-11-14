import { useState, useMemo } from 'react';

/**
 * Table hook: search, sort, paginate
 * @param {Array} data
 * @param {Object} options - { searchKeys, pageSize, defaultSort, defaultSortDir }
 */
export function useTable(data, options = {}) {
  const {
    searchKeys = [],
    pageSize = 10,
    defaultSort = null,
    defaultSortDir = 'asc',
  } = options;

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = data || [];
    if (search && searchKeys.length) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => {
          const val = key.split('.').reduce((o, k) => o?.[k], item);
          return String(val || '').toLowerCase().includes(q);
        })
      );
    }
    return result;
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = sortKey.split('.').reduce((o, k) => o?.[k], a);
      const bVal = sortKey.split('.').reduce((o, k) => o?.[k], b);
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal || '').localeCompare(String(bVal || ''));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (q) => {
    setSearch(q);
    setPage(1);
  };

  return {
    data: paginated,
    allData: sorted,
    search,
    setSearch: handleSearch,
    sortKey,
    sortDir,
    handleSort,
    page: safePage,
    setPage,
    totalPages,
    totalCount: sorted.length,
    pageSize,
  };
}
