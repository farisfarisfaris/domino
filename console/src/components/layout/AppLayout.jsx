import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content dot-grid">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
