import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';

export default function Receipts() {
  const navigate = useNavigate();
  const { adminKey } = useConnection();
  const { data, loading } = useDominoAPI('/admin/receipts', { skip: !adminKey });
  const [search, setSearch] = useState('');

  if (!adminKey) return <div className="empty-state">Connect to broker in Settings</div>;
  if (loading) return <div className="loading-state">Loading...</div>;

  let receipts = data?.receipts || [];
  if (search) {
    const term = search.toLowerCase();
    receipts = receipts.filter(r => r.receipt_id.toLowerCase().includes(term));
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Receipts</h1>
        <div className="page-header-right">
          <span className="page-count">{data?.total || 0} receipts</span>
          <div className="search-wrapper">
            <Search />
            <input className="search-input" placeholder="Search by receipt ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 160 }}>Receipt ID</th>
            <th>Participants</th>
            <th style={{ width: 140 }}>Scope</th>
            <th className="col-actions-count">Actions</th>
            <th style={{ width: 100 }}>Outcome</th>
            <th className="col-timestamp">Generated</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length === 0 && (
            <tr className="no-click"><td colSpan={6}><div className="empty-state">No receipts found</div></td></tr>
          )}
          {receipts.map(r => (
            <tr key={r.receipt_id} onClick={() => navigate(`/receipts/${r.receipt_id}`)}>
              <td><span className="mono" title={r.receipt_id}>{r.receipt_id.slice(0, 18)}...</span></td>
              <td>
                {r.initiator?.agent_name || 'unknown'}
                <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                {r.target?.agent_name || 'unknown'}
              </td>
              <td><span className="mono">{r.scope}</span></td>
              <td className="col-actions-count">{r.action_count}</td>
              <td><span className={`badge ${r.outcome}`}>{r.outcome}</span></td>
              <td><span className="mono">{formatRelativeTime(r.session_closed)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
