import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime, formatDuration, formatTimestamp } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const { data, loading } = useDominoAPI(`/admin/sessions/${sessionId}`, { skip: !adminKey });

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!data?.session) return <div className="error-state">Session not found</div>;

  const s = data.session;

  return (
    <div>
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-id">{s.session_id}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className={`badge ${s.status}`}>{s.status}</span>
            <span className="mono">{s.scope}</span>
          </div>
          <div className="detail-meta">
            <span>Established {formatRelativeTime(s.established_at)}</span>
            <span>Duration: {formatDuration(s.closed_at ? new Date(s.closed_at) - new Date(s.established_at) : null)}</span>
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="participants-bar">
        <div className="participant-card">
          <div className="participant-name">{s.initiator?.agent_name || 'unknown'}</div>
          <div className="participant-meta">
            <span className={`badge ${s.initiator?.agent_type}`}>{s.initiator?.agent_type}</span>
            <span style={{ marginLeft: 8 }}>{s.initiator?.owner}</span>
          </div>
        </div>
        <div className="participant-connector">
          <div className="participant-connector-line" />
          <div className="participant-connector-label">{s.scope}</div>
        </div>
        <div className="participant-card" style={{ textAlign: 'right' }}>
          <div className="participant-name">{s.target?.agent_name || 'unknown'}</div>
          <div className="participant-meta">
            <span>{s.target?.owner}</span>
            <span className={`badge ${s.target?.agent_type}`} style={{ marginLeft: 8 }}>{s.target?.agent_type}</span>
          </div>
        </div>
      </div>

      {/* Consent */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Consent Scope</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Permitted</div>
          <div className="scope-pills">
            {(s.consent?.permissions || []).map(p => (
              <span key={p} className="scope-pill permitted">{p}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Excluded</div>
          <div className="scope-pills">
            {(s.consent?.excluded || []).map(e => (
              <span key={e} className="scope-pill excluded">{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Timeline */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Interaction Timeline</div>
        {(!s.actions || s.actions.length === 0) ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No actions recorded</div>
        ) : (
          <div className="timeline">
            {s.actions.map(action => (
              <ActionTimelineItem key={action.action_id} action={action} session={s} />
            ))}
          </div>
        )}
      </div>

      {/* Receipt */}
      {s.receipt && (
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/receipts/${s.receipt.receipt_id}`)}>
          <div className="section-title">
            <span>Signed Receipt</span>
            <span className="section-link">View Receipt →</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span className="mono">{s.receipt.receipt_id}</span>
            <span className={`badge ${s.receipt.outcome}`}>{s.receipt.outcome}</span>
            <span className="mono">{formatRelativeTime(s.receipt.generated_at)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionTimelineItem({ action, session }) {
  const [expanded, setExpanded] = useState(false);
  const isInitiator = action.agent_id === session.initiator?.agent_id;

  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ background: isInitiator ? 'var(--purple)' : 'var(--info)' }} />
      <div className="timeline-time">{formatTimestamp(action.timestamp)}</div>
      <div className="timeline-content">
        <span className="timeline-agent">{action.agent_name || 'unknown'}</span>
        <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
        <span className="timeline-action">{action.action}</span>
      </div>
      {action.details && Object.keys(action.details).length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            {expanded ? 'Hide details' : 'Details'}
          </button>
          {expanded && (
            <div className="timeline-details">
              {JSON.stringify(action.details, null, 2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
