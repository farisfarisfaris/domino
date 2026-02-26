import { useConnection } from '../../context/ConnectionContext';

export default function TopBar() {
  const { status, brokerUrl } = useConnection();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <svg className="topbar-logo" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="4" width="24" height="24" rx="4" transform="rotate(45 16 16)" fill="#7B2FF2"/>
        </svg>
        <span className="topbar-title">DOMINO</span>
      </div>
      <div className="topbar-status">
        <span className={`topbar-status-dot ${status}`} />
        {status === 'connected' && <span>Connected to {brokerUrl}</span>}
        {status === 'disconnected' && <span>Disconnected</span>}
        {status === 'error' && <span>Connection error</span>}
      </div>
    </header>
  );
}
