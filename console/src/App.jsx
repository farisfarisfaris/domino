import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider } from './context/ConnectionContext';
import { PreferencesProvider } from './context/PreferencesContext';
import AppLayout from './components/layout/AppLayout';
import Overview from './pages/Overview';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import Receipts from './pages/Receipts';
import ReceiptDetail from './pages/ReceiptDetail';
import Security from './pages/Security';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionProvider>
        <PreferencesProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/agents/:agentId" element={<AgentDetail />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:sessionId" element={<SessionDetail />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/receipts/:receiptId" element={<ReceiptDetail />} />
              <Route path="/security" element={<Security />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </PreferencesProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}
