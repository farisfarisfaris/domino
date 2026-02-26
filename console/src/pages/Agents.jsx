import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function Agents() {
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const { data, loading, error } = useDominoAPI('/admin/agents', { skip: !adminKey });
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  if (!adminKey) return <div className="empty-state">Connect to broker in Settings</div>;
  if (loading) return <div className="loading-state">Loading...</div>;
  if (error) return <div className="error-state">Error loading agents</div>;

  let agents = data?.agents || [];
  if (filter !== 'all') agents = agents.filter(a => a.status === filter);
  if (typeFilter !== 'all') agents = agents.filter(a => a.agent_type === typeFilter);
  if (search) {
    const term = search.toLowerCase();
    agents = agents.filter(a => a.agent_name.toLowerCase().includes(term) || (a.owner || '').toLowerCase().includes(term));
  }

  const allAgents = data?.agents || [];
  const counts = {
    all: allAgents.length,
    active: allAgents.filter(a => a.status === 'active').length,
    revoked: allAgents.filter(a => a.status === 'revoked').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agents</h1>
        <div className="page-header-right">
          <span className="page-count">{data?.total || 0} agents</span>
          <div className="search-wrapper">
            <Search />
            <input className="search-input" placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="filter-bar">
        {['all', 'active', 'revoked'].map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] || 0})
          </button>
        ))}
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="personal">Personal</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th className="col-status">Status</th>
            <th>Agent</th>
            <th className="col-narrow">Type</th>
            <th style={{ width: 80, textAlign: 'right' }}>Sessions</th>
            <th className="col-timestamp">Last Active</th>
            <th className="col-timestamp">Registered</th>
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 && (
            <tr className="no-click"><td colSpan={6}><div className="empty-state">No agents found</div></td></tr>
          )}
          {agents.map(agent => (
            <tr key={agent.agent_id} onClick={() => navigate(`/agents/${agent.agent_id}`)}>
              <td className="col-status"><span className={`status-dot ${agent.status}`} /></td>
              <td>
                <div style={{ fontWeight: 500 }}>{agent.agent_name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{agent.owner}</div>
              </td>
              <td><span className={`badge ${agent.agent_type}`}>{agent.agent_type}</span></td>
              <td style={{ textAlign: 'right' }}>{agent.session_count}</td>
              <td><span className="mono">{formatRelativeTime(agent.last_active)}</span></td>
              <td><span className="mono">{formatRelativeTime(agent.registered_at)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
