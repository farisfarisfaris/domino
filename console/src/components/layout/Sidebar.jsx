import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, ArrowLeftRight, FileCheck, Shield, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/sessions', icon: ArrowLeftRight, label: 'Sessions' },
  { to: '/receipts', icon: FileCheck, label: 'Receipts' },
  { to: '/security', icon: Shield, label: 'Security' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-divider" />
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings />
          <span>Settings</span>
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <PanelLeft /> : <PanelLeftClose />}
        </button>
      </div>
    </aside>
  );
}
