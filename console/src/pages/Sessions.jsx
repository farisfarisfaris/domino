import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileCheck } from 'lucide-react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime, formatDuration } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function Sessions() {
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const { data, loading } = useDominoAPI('/admin/sessions', { skip: !adminKey });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  if (!adminKey) return <div className="empty-state">Connect to broker in Settings</div>;
  if (loading) return <div className="loading-state">Loading...</div>;

  let sessions = data?.sessions || [];
  const allSessions = sessions;
  if (filter !== 'all') sessions = sessions.filter(s => s.status === filter);
  if (search) {
    const term = search.toLowerCase();
    sessions = sessions.filter(s => s.session_id.toLowerCase().includes(term));
  }

  const counts = {
    all: allSessions.length,
    active: allSessions.filter(s => s.status === 'active').length,
    closed: allSessions.filter(s => s.status === 'closed').length,
    expired: allSessions.filter(s => s.status === 'expired').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sessions</h1>
        <div className="page-header-right">
          <span className="page-count">{data?.total || 0} sessions</span>
          <div className="search-wrapper">
            <Search />
            <input className="search-input" placeholder="Search by session ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="filter-bar">
        {['all', 'active', 'closed', 'expired'].map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] || 0})
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th className="col-status">Status</th>
            <th>Participants</th>
            <th style={{ width: 160 }}>Scope</th>
            <th className="col-actions-count">Actions</th>
            <th style={{ width: 100 }}>Duration</th>
            <th className="col-icon">Receipt</th>
            <th className="col-timestamp">Established</th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 && (
            <tr className="no-click"><td colSpan={7}><div className="empty-state">No sessions found</div></td></tr>
          )}
          {sessions.map(s => (
            <tr key={s.session_id} onClick={() => navigate(`/sessions/${s.session_id}`)}>
              <td><span className={`status-dot ${s.status}`} /></td>
              <td>
                <span>{s.initiator?.agent_name || 'unknown'}</span>
                <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                <span>{s.target?.agent_name || 'unknown'}</span>
                <span style={{ marginLeft: 8 }}>
                  <span className={`badge ${s.initiator?.agent_type}`} style={{ marginRight: 4 }}>{s.initiator?.agent_type?.[0]}</span>
                  <span className={`badge ${s.target?.agent_type}`}>{s.target?.agent_type?.[0]}</span>
                </span>
              </td>
              <td><span className="mono">{s.scope}</span></td>
              <td className="col-actions-count">{s.action_count}</td>
              <td><span className="mono">{formatDuration(s.duration_ms)}</span></td>
              <td className="col-icon">
                {s.has_receipt && <FileCheck size={16} style={{ color: 'var(--info)' }} />}
              </td>
              <td><span className="mono">{formatRelativeTime(s.established_at)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
