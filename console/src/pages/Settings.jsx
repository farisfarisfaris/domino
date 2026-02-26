import { useState } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { usePreferences } from '../context/PreferencesContext';

export default function SettingsPage() {
  const { brokerUrl, setBrokerUrl, adminKey, setAdminKey, testConnection, status, brokerVersion } = useConnection();
  const { refreshInterval, timeFormat, dateFormat, tableDensity, updatePreference } = usePreferences();

  const [urlInput, setUrlInput] = useState(brokerUrl);
  const [keyInput, setKeyInput] = useState(adminKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(urlInput, keyInput);
    setTestResult(result);
    if (result.success) {
      setBrokerUrl(urlInput);
      setAdminKey(keyInput);
    }
    setTesting(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Connection</h2>
        <div className="settings-row">
          <label className="settings-label">Broker URL</label>
          <div className="settings-value">
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">Admin API Key</label>
          <div className="settings-value" style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="Enter admin key"
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(s => !s)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label" />
          <div className="settings-value">
            <button className="btn btn-primary" onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
        {testResult && (
          <div className={`connection-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success
              ? `Connected — Broker v${testResult.health?.version}, ${testResult.health?.registered_agents} agents registered`
              : `Failed — ${testResult.error}`}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Console Preferences</h2>
        <div className="settings-row">
          <label className="settings-label">Auto-refresh interval</label>
          <div className="settings-value">
            <select value={refreshInterval} onChange={e => updatePreference('refreshInterval', Number(e.target.value))}>
              <option value={0}>Off</option>
              <option value={3}>3 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">Time format</label>
          <div className="settings-value">
            <select value={timeFormat} onChange={e => updatePreference('timeFormat', e.target.value)}>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">Date format</label>
          <div className="settings-value">
            <select value={dateFormat} onChange={e => updatePreference('dateFormat', e.target.value)}>
              <option value="relative">Relative (2 min ago)</option>
              <option value="absolute">Absolute (2026-02-25 10:03:30)</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">Table density</label>
          <div className="settings-value">
            <select value={tableDensity} onChange={e => updatePreference('tableDensity', e.target.value)}>
              <option value="compact">Compact</option>
              <option value="default">Default</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">Theme</label>
          <div className="settings-value">
            <select value="dark" disabled>
              <option value="dark">Dark</option>
            </select>
            <div className="settings-hint">Light mode coming soon</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="settings-row">
          <span className="settings-label">Domino Broker</span>
          <span className="settings-value mono">{brokerVersion || '—'}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Console Version</span>
          <span className="settings-value mono">1.0.0</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Broker URL</span>
          <span className="settings-value mono">{brokerUrl || '—'}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Status</span>
          <span className="settings-value">
            <span className={`status-dot ${status}`} style={{ marginRight: 8 }} />
            {status}
          </span>
        </div>
        {brokerUrl && (
          <div className="settings-row">
            <span className="settings-label">API Docs</span>
            <span className="settings-value">
              <a href={`${brokerUrl}/docs`} target="_blank" rel="noopener noreferrer">{brokerUrl}/docs</a>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
