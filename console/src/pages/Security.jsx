import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function Security() {
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const [tab, setTab] = useState('handshakes');
  const { data: hsData, loading: hsLoading } = useDominoAPI('/admin/handshakes', { skip: !adminKey });
  const { data: violData, loading: violLoading } = useDominoAPI('/admin/scope-violations', { skip: !adminKey });
  const [hsFilter, setHsFilter] = useState('all');

  if (!adminKey) return <div className="empty-state">Connect to broker in Settings</div>;

  const allEvents = hsData?.handshake_events || [];
  const violations = violData?.violations || [];
  const failedEvents = allEvents.filter(e => !e.success);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Security</h1>
        <div className="page-header-right">
          {failedEvents.length > 0 && (
            <span className="page-count" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: 'none' }}>
              {failedEvents.length} blocked
            </span>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'handshakes' ? 'active' : ''}`} onClick={() => setTab('handshakes')}>Handshake Log</button>
        <button className={`tab ${tab === 'blocked' ? 'active' : ''}`} onClick={() => setTab('blocked')}>Blocked Attempts</button>
        <button className={`tab ${tab === 'violations' ? 'active' : ''}`} onClick={() => setTab('violations')}>Scope Violations</button>
      </div>

      {tab === 'handshakes' && (
        <>
          <div className="filter-bar">
            {['all', 'completed', 'failed'].map(f => (
              <button key={f} className={`filter-pill ${hsFilter === f ? 'active' : ''}`} onClick={() => setHsFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {' '}({f === 'all' ? allEvents.length : f === 'completed' ? allEvents.filter(e => e.success).length : failedEvents.length})
              </button>
            ))}
          </div>
          {hsLoading ? <div className="loading-state">Loading...</div> : (
            <HandshakeTable
              events={hsFilter === 'all' ? allEvents : hsFilter === 'completed' ? allEvents.filter(e => e.success) : failedEvents}
              navigate={navigate}
            />
          )}
        </>
      )}

      {tab === 'blocked' && (
        hsLoading ? <div className="loading-state">Loading...</div> : (
          <HandshakeTable events={failedEvents} navigate={navigate} />
        )
      )}

      {tab === 'violations' && (
        violLoading ? <div className="loading-state">Loading...</div> : (
          <ViolationsTable violations={violations} navigate={navigate} />
        )
      )}
    </div>
  );
}

function HandshakeTable({ events, navigate }) {
  if (events.length === 0) {
    return <div className="empty-state">No handshake events</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th className="col-status" />
          <th style={{ width: 140 }}>Handshake ID</th>
          <th>Initiator</th>
          <th>Target</th>
          <th style={{ width: 140 }}>Scope</th>
          <th style={{ width: 160 }}>Failure Reason</th>
          <th className="col-timestamp">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {events.map(ev => (
          <tr
            key={ev.event_id}
            className={ev.success ? '' : 'row-failed'}
            onClick={() => ev.session_id && navigate(`/sessions/${ev.session_id}`)}
            style={ev.session_id ? {} : { cursor: 'default' }}
          >
            <td>
              {ev.success
                ? <span style={{ color: 'var(--success)' }}>✓</span>
                : <span style={{ color: 'var(--danger)' }}>✗</span>}
            </td>
            <td><span className="mono">{ev.handshake_id ? ev.handshake_id.slice(0, 16) : '—'}</span></td>
            <td>{ev.initiator_agent_name || 'unknown'}</td>
            <td>{ev.target_agent_name || 'unknown'}</td>
            <td><span className="mono">{ev.requested_scope || '—'}</span></td>
            <td>
              {!ev.success && ev.error_code && (
                <span className="badge failed">{ev.error_code}</span>
              )}
            </td>
            <td><span className="mono">{formatRelativeTime(ev.timestamp)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ViolationsTable({ violations, navigate }) {
  if (violations.length === 0) {
    return <div className="empty-state">No scope violations recorded</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th className="col-timestamp">Timestamp</th>
          <th style={{ width: 160 }}>Session</th>
          <th>Agent</th>
          <th>Attempted Action</th>
          <th style={{ width: 140 }}>Active Scope</th>
          <th style={{ width: 100 }}>Result</th>
        </tr>
      </thead>
      <tbody>
        {violations.map(v => (
          <tr key={v.violation_id} onClick={() => navigate(`/sessions/${v.session_id}`)}>
            <td><span className="mono">{formatRelativeTime(v.timestamp)}</span></td>
            <td><span className="mono">{v.session_id.slice(0, 16)}...</span></td>
            <td>{v.agent_name || v.agent_id}</td>
            <td><span className="mono">{v.attempted_action}</span></td>
            <td><span className="mono">{v.scope}</span></td>
            <td><span className="badge blocked">{v.result}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
