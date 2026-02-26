import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { usePreferences } from '../context/PreferencesContext';
import { dominoFetch } from '../api/client';

export function useDominoAPI(path, options = {}) {
  const { brokerUrl, adminKey, status } = useConnection();
  const { refreshInterval } = usePreferences();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const { skip = false } = options;

  const refresh = useCallback(async () => {
    if (!brokerUrl || !adminKey || skip) return;
    try {
      setLoading(prev => prev || !data);
      const result = await dominoFetch(path, { brokerUrl, adminKey });
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [path, brokerUrl, adminKey, skip]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (!skip) refresh();
    return () => { mountedRef.current = false; };
  }, [refresh, skip]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || skip) return;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refresh, refreshInterval, skip]);

  return { data, loading: loading && !data, error, refresh };
}
