import { useNavigate } from 'react-router-dom';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function Overview() {
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const skip = !adminKey;
  const { data: stats, loading: statsLoading } = useDominoAPI('/admin/stats', { skip });
  const { data: hsData } = useDominoAPI('/admin/handshakes?limit=30', { skip });

  if (skip) {
    return (
      <div className="empty-state">
        <p>Configure your broker connection in Settings to get started.</p>
        <button className="btn btn-primary" onClick={() => navigate('/settings')}>Go to Settings</button>
      </div>
    );
  }

  if (statsLoading) {
    return <div className="loading-state">Loading...</div>;
  }

  const s = stats || {};
  const agents = s.agents || {};
  const hs24 = s.handshakes_24h || {};
  const events = (hsData?.handshake_events || []).slice(0, 30);

  const statCards = [
    { label: 'Trusted Agents', value: agents.total || 0, color: 'var(--purple)', sub: `${agents.active || 0} active`, to: '/agents' },
    { label: 'Active Sessions', value: s.active_sessions || 0, color: 'var(--success)', to: '/sessions?status=active' },
    { label: 'Handshakes (24h)', value: hs24.total || 0, color: 'var(--purple)', sub: hs24.success_rate != null ? `${hs24.success_rate}% success rate` : null, to: '/security' },
    { label: 'Blocked (24h)', value: s.blocked_24h || 0, color: 'var(--danger)', to: '/security' },
    { label: 'Receipts (24h)', value: s.receipts_24h || 0, color: 'var(--info)', to: '/receipts' },
    { label: 'Scope Violations (24h)', value: s.scope_violations_24h || 0, color: 'var(--warning)', to: '/security' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
      </div>

      <div className="stats-grid">
        {statCards.map(card => (
          <a
            key={card.label}
            className="stat-card"
            style={{ borderLeftColor: card.color }}
            onClick={() => navigate(card.to)}
          >
            <div className="stat-card-number">{card.value}</div>
            <div className="stat-card-label">{card.label}</div>
            {card.sub && <div className="stat-card-sub">{card.sub}</div>}
          </a>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">
            <span>Recent Activity</span>
            <a className="section-link" onClick={() => navigate('/security')}>View all</a>
          </div>
          <div className="activity-feed">
            {events.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 0' }}>No recent activity</div>
            )}
            {events.map(ev => {
              const dotClass = ev.success
                ? (ev.type === 'complete' ? 'completed' : 'purple')
                : 'failed';
              const desc = ev.success
                ? `${ev.initiator_agent_name || 'unknown'} → ${ev.target_agent_name || 'unknown'} · ${ev.requested_scope || '—'}`
                : `${ev.initiator_agent_name || 'unknown'} → ${ev.target_agent_name || 'unknown'} · ${ev.error_code}`;
              return (
                <div
                  key={ev.event_id}
                  className="activity-item"
                  onClick={() => ev.session_id && navigate(`/sessions/${ev.session_id}`)}
                >
                  <span className={`status-dot activity-dot ${dotClass}`} />
                  <div className="activity-content">
                    <div className="activity-desc">{desc}</div>
                  </div>
                  <span className="activity-time">{formatRelativeTime(ev.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-title">Network Composition</div>
            {agents.total > 0 ? (
              <>
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ flex: agents.by_type?.personal || 0, background: 'var(--info)' }} />
                  <div style={{ flex: agents.by_type?.enterprise || 0, background: 'var(--purple)' }} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {agents.by_type?.personal || 0} personal · {agents.by_type?.enterprise || 0} enterprise
                </div>
              </>
            ) : (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No agents registered</div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Handshake Health</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: getHealthColor(hs24.success_rate) }}>
              {hs24.success_rate != null ? `${hs24.success_rate}%` : '—'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              {hs24.total || 0} handshakes in the last 24h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHealthColor(rate) {
  if (rate == null) return 'var(--text-muted)';
  if (rate >= 95) return 'var(--success)';
  if (rate >= 80) return 'var(--warning)';
  return 'var(--danger)';
}
