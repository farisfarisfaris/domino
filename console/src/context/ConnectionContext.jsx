import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ConnectionContext = createContext(null);

const STORAGE_KEYS = {
  brokerUrl: 'domino_broker_url',
  adminKey: 'domino_admin_key',
};

export function ConnectionProvider({ children }) {
  const [brokerUrl, setBrokerUrl] = useState(
    () => localStorage.getItem(STORAGE_KEYS.brokerUrl) || import.meta.env.VITE_BROKER_URL || 'http://localhost:3000'
  );
  const [adminKey, setAdminKey] = useState(
    () => localStorage.getItem(STORAGE_KEYS.adminKey) || ''
  );
  const [status, setStatus] = useState('disconnected'); // 'connected' | 'disconnected' | 'error'
  const [brokerVersion, setBrokerVersion] = useState(null);
  const [lastPing, setLastPing] = useState(null);

  const saveBrokerUrl = useCallback((url) => {
    const cleaned = url.replace(/\/+$/, '');
    setBrokerUrl(cleaned);
    localStorage.setItem(STORAGE_KEYS.brokerUrl, cleaned);
  }, []);

  const saveAdminKey = useCallback((key) => {
    setAdminKey(key);
    localStorage.setItem(STORAGE_KEYS.adminKey, key);
  }, []);

  const testConnection = useCallback(async (url, key) => {
    const target = (url || brokerUrl).replace(/\/+$/, '');
    const token = key !== undefined ? key : adminKey;
    try {
      const res = await fetch(`${target}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Also test admin auth if key provided
      if (token) {
        const adminRes = await fetch(`${target}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!adminRes.ok) {
          return { success: false, error: `Admin auth failed: ${adminRes.status}`, health: data };
        }
      }

      return { success: true, health: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [brokerUrl, adminKey]);

  // Background health check every 30s
  useEffect(() => {
    if (!brokerUrl || !adminKey) {
      setStatus('disconnected');
      return;
    }

    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch(`${brokerUrl}/health`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setStatus('connected');
          setBrokerVersion(data.version);
          setLastPing(new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [brokerUrl, adminKey]);

  return (
    <ConnectionContext.Provider value={{
      brokerUrl, setBrokerUrl: saveBrokerUrl,
      adminKey, setAdminKey: saveAdminKey,
      status, brokerVersion, lastPing,
      testConnection,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be inside ConnectionProvider');
  return ctx;
}
