import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useDominoAPI } from '../hooks/useDominoAPI';
import { formatRelativeTime, formatTimestamp } from '../hooks/useRelativeTime';
import { useConnection } from '../context/ConnectionContext';
import { dominoFetch } from '../api/client';

export default function ReceiptDetail() {
  const { receiptId } = useParams();
  const { adminKey, brokerUrl } = useConnection();
  const { data, loading } = useDominoAPI(`/admin/receipts/${receiptId}`, { skip: !adminKey });
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!data?.receipt) return <div className="error-state">Receipt not found</div>;

  const r = data.receipt;

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const receiptBody = {
        receipt_id: r.receipt_id,
        handshake_id: r.handshake_id,
        session_id: r.session_id,
        initiator: r.initiator,
        target: r.target,
        scope: r.scope,
        actions: r.actions,
        outcome: r.outcome,
        session_started: r.session_started,
        session_closed: r.session_closed,
      };
      const result = await dominoFetch('/receipt/verify', {
        brokerUrl,
        method: 'POST',
        body: { receipt: receiptBody, receipt_signature: r.receipt_signature },
      });
      setVerifyResult(result);
    } catch (err) {
      setVerifyResult({ valid: false, error: err.message });
    }
    setVerifying(false);
  };

  const truncateSig = (sig) => {
    if (!sig || sig.length <= 40) return sig;
    return `${sig.slice(0, 32)}...${sig.slice(-8)}`;
  };

  return (
    <div>
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-id">{r.receipt_id}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className={`badge ${r.outcome}`}>{r.outcome}</span>
            <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>Generated {formatRelativeTime(r.session_closed)}</span>
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="participants-bar">
        <div className="participant-card">
          <div className="participant-name">{r.initiator?.agent_name || 'unknown'}</div>
          <div className="participant-meta">{r.initiator?.owner}</div>
        </div>
        <div className="participant-connector">
          <div className="participant-connector-line" />
          <div className="participant-connector-label">{r.scope}</div>
        </div>
        <div className="participant-card" style={{ textAlign: 'right' }}>
          <div className="participant-name">{r.target?.agent_name || 'unknown'}</div>
          <div className="participant-meta">{r.target?.owner}</div>
        </div>
      </div>

      {/* Actions Timeline */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Interaction Timeline</div>
        {(!r.actions || r.actions.length === 0) ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No actions</div>
        ) : (
          <div className="timeline">
            {r.actions.map(action => (
              <div key={action.action_id} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-time">{formatTimestamp(action.timestamp)}</div>
                <div className="timeline-content">
                  <span className="timeline-agent mono">{action.agent_id}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
                  <span className="timeline-action">{action.action}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature Verification */}
      <div className="sig-verify-card" style={{ marginBottom: 16 }}>
        <div className="section-title">Cryptographic Verification</div>
        <div className="sig-verify-row">
          <span className="sig-verify-label">Signature</span>
          <span className="sig-verify-value mono-copy" onClick={() => copyText(r.receipt_signature, 'sig')}>
            {truncateSig(r.receipt_signature)} {copied === 'sig' ? <Check size={12} /> : <Copy size={12} />}
          </span>
        </div>
        <div className="sig-verify-row">
          <span className="sig-verify-label">Public Key</span>
          <span className="sig-verify-value mono-copy" onClick={() => copyText(r.domino_public_key, 'pk')}>
            {truncateSig(r.domino_public_key)} {copied === 'pk' ? <Check size={12} /> : <Copy size={12} />}
          </span>
        </div>
        <div className="sig-verify-row">
          <span className="sig-verify-label">Algorithm</span>
          <span className="sig-verify-value">{r.signing_algorithm}</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify Signature'}
          </button>
        </div>

        {verifyResult && (
          <div className={`sig-result ${verifyResult.valid ? 'valid' : 'invalid'}`}>
            {verifyResult.valid ? (
              <>
                <ShieldCheck size={20} />
                <span>Signature verified · Signed by {verifyResult.signed_by} · No tampering detected</span>
              </>
            ) : (
              <>
                <ShieldAlert size={20} />
                <span>Verification failed · Possible tampering detected</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Raw JSON */}
      <div className="card">
        <div className="section-title">
          <span style={{ cursor: 'pointer' }} onClick={() => setShowRaw(s => !s)}>
            Raw Receipt (JSON) {showRaw ? '▾' : '▸'}
          </span>
          {showRaw && (
            <button className="btn btn-secondary btn-sm" onClick={() => copyText(JSON.stringify(r, null, 2), 'json')}>
              {copied === 'json' ? 'Copied' : 'Copy JSON'}
            </button>
          )}
        </div>
        {showRaw && (
          <div className="json-block">
            {JSON.stringify(r, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}
