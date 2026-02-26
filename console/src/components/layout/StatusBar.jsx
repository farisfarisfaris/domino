import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

const ROUTE_NAMES = {
  '/': 'Overview',
  '/agents': 'Agents',
  '/sessions': 'Sessions',
  '/receipts': 'Receipts',
  '/security': 'Security',
  '/settings': 'Settings',
};

export default function StatusBar() {
  const location = useLocation();
  const { refreshInterval, updatePreference } = usePreferences();

  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const pageName = ROUTE_NAMES[basePath] || basePath;

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span>{pageName}</span>
      </div>
      <div className="statusbar-right">
        <div className="statusbar-refresh">
          <span>Auto-refresh:</span>
          <select
            value={refreshInterval}
            onChange={e => updatePreference('refreshInterval', Number(e.target.value))}
          >
            <option value={0}>Off</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>
        </div>
      </div>
    </footer>
  );
}
