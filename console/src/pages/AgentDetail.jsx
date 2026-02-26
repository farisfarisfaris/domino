import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime, formatDuration } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const { data, loading, error } = useDominoAPI(`/admin/agents/${agentId}`, { skip: !adminKey });
  const [tab, setTab] = useState('activity');
  const [copied, setCopied] = useState(null);

  if (loading) return <div className="loading-state">Loading...</div>;
  if (error) return <div className="error-state">Agent not found</div>;
  if (!data) return null;

  const { agent, sessions, handshake_events } = data;

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <div className="detail-header">
        <div className="detail-header-left">
          <h1 className="page-title">{agent.agent_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className={`badge ${agent.status}`}>{agent.status}</span>
            <span className={`badge ${agent.agent_type}`}>{agent.agent_type}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>owned by {agent.owner}</span>
          </div>
          <div className="detail-meta">
            <span>Registered {formatRelativeTime(agent.registered_at)}</span>
            <span className="mono-copy" onClick={() => copyText(agent.agent_id, 'id')}>
              {agent.agent_id} {copied === 'id' ? <Check size={12} /> : <Copy size={12} />}
            </span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
        <button className={`tab ${tab === 'handshakes' ? 'active' : ''}`} onClick={() => setTab('handshakes')}>Handshakes</button>
        <button className={`tab ${tab === 'credential' ? 'active' : ''}`} onClick={() => setTab('credential')}>Credential</button>
      </div>

      {tab === 'activity' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Counterpart</th>
              <th>Scope</th>
              <th className="col-narrow">Status</th>
              <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
              <th className="col-timestamp">Date</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr className="no-click"><td colSpan={6}><div className="empty-state">No sessions yet</div></td></tr>
            )}
            {sessions.map(s => (
              <tr key={s.session_id} onClick={() => navigate(`/sessions/${s.session_id}`)}>
                <td><span className={`badge ${s.role === 'initiator' ? 'purple' : 'info'}`}>{s.role}</span></td>
                <td>{s.counterpart_agent_name}</td>
                <td><span className="mono">{s.scope}</span></td>
                <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                <td style={{ textAlign: 'right' }}>{s.action_count}</td>
                <td><span className="mono">{formatRelativeTime(s.established_at)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'handshakes' && (
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-status" />
              <th>Type</th>
              <th>Counterpart</th>
              <th>Scope</th>
              <th>Result</th>
              <th className="col-timestamp">Time</th>
            </tr>
          </thead>
          <tbody>
            {handshake_events.length === 0 && (
              <tr className="no-click"><td colSpan={6}><div className="empty-state">No handshake events</div></td></tr>
            )}
            {handshake_events.map(ev => (
              <tr key={ev.event_id} className={ev.success ? '' : 'row-failed no-click'}>
                <td><span className={`status-dot ${ev.success ? 'completed' : 'failed'}`} /></td>
                <td>{ev.type}</td>
                <td>{ev.counterpart_agent_name || 'unknown'}</td>
                <td><span className="mono">{ev.requested_scope || '—'}</span></td>
                <td>
                  {ev.success
                    ? <span className="badge success">success</span>
                    : <span className="badge failed">{ev.error_code}</span>}
                </td>
                <td><span className="mono">{formatRelativeTime(ev.timestamp)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'credential' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="settings-row">
            <span className="settings-label">Public Key</span>
            <span className="mono-copy settings-value" onClick={() => copyText(agent.public_key, 'pk')} style={{ wordBreak: 'break-all' }}>
              {agent.public_key} {copied === 'pk' ? <Check size={12} /> : <Copy size={12} />}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Thumbprint</span>
            <span className="mono-copy settings-value" onClick={() => copyText(agent.public_key_thumbprint, 'tp')} style={{ wordBreak: 'break-all' }}>
              {agent.public_key_thumbprint} {copied === 'tp' ? <Check size={12} /> : <Copy size={12} />}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Credential Expires</span>
            <span className="settings-value mono">{agent.credential_expires_at || '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Registered</span>
            <span className="settings-value mono">{agent.registered_at}</span>
          </div>
        </div>
      )}
    </div>
  );
}
