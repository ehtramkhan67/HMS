import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data-fetching hook with loading, error, and empty states.
 * @param {Function} fetchFn - async function returning data
 * @param {Array} deps - dependency array to refetch on change
 * @param {Object} options - { autoFetch = true }
 */
export function useFetch(fetchFn, deps = [], options = {}) {
  const { autoFetch = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to load data');
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (autoFetch) execute();
  }, [execute, autoFetch]);

  return { data, loading, error, execute, setData, refetch: execute };
}
