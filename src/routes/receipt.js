const { Router } = require('express');
const crypto = require('crypto');
const { getDominoPrivateKey, getDominoPublicKeyBase64 } = require('../crypto/keys');
const store = require('../store/memory');

const router = Router();

function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function signReceipt(receiptObj) {
  const privateKey = getDominoPrivateKey();
  const data = Buffer.from(canonicalize(receiptObj));
  return crypto.sign(null, data, privateKey).toString('base64');
}

function verifyReceiptSignature(receiptObj, signatureBase64) {
  const { getDominoPublicKey } = require('../crypto/keys');
  const publicKey = getDominoPublicKey();
  const data = Buffer.from(canonicalize(receiptObj));
  const signature = Buffer.from(signatureBase64, 'base64');
  return crypto.verify(null, data, publicKey, signature);
}

router.post('/generate', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'validation_error', message: 'session_id is required' });
    }

    const session = store.getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'Session not found' });
    }
    if (session.status === 'closed') {
      return res.status(409).json({ error: 'already_closed', message: 'Session already closed and receipt generated' });
    }

    // Close the session
    const closedAt = new Date().toISOString();
    store.updateSession(session_id, { status: 'closed' });

    // Look up agent details
    const initiator = store.getAgent(session.initiator_agent_id);
    const target = store.getAgent(session.target_agent_id);

    // Build receipt
    const receipt_id = `rcpt_${crypto.randomBytes(6).toString('hex')}`;
    const receipt = {
      receipt_id,
      handshake_id: session.handshake_id,
      session_id: session.session_id,
      initiator: {
        agent_id: session.initiator_agent_id,
        agent_name: initiator ? initiator.agent_name : 'unknown',
        owner: initiator ? initiator.owner : 'unknown',
      },
      target: {
        agent_id: session.target_agent_id,
        agent_name: target ? target.agent_name : 'unknown',
        owner: target ? target.owner : 'unknown',
      },
      scope: session.scope,
      actions: session.actions.map(a => ({
        action_id: a.action_id,
        agent_id: a.agent_id,
        action: a.action,
        timestamp: a.timestamp,
      })),
      outcome: 'completed',
      session_started: session.established_at,
      session_closed: closedAt,
    };

    // Sign the receipt
    const receipt_signature = signReceipt(receipt);
    const domino_public_key = getDominoPublicKeyBase64();

    // Store receipt
    store.storeReceipt({ ...receipt, receipt_signature, domino_public_key });

    return res.status(200).json({
      ...receipt,
      receipt_signature,
      domino_public_key,
    });
  } catch (err) {
    console.error('Receipt generation error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Receipt generation failed' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { receipt, receipt_signature } = req.body;

    if (!receipt || !receipt_signature) {
      return res.status(400).json({ error: 'validation_error', message: 'receipt and receipt_signature are required' });
    }

    let valid;
    try {
      valid = verifyReceiptSignature(receipt, receipt_signature);
    } catch {
      valid = false;
    }

    return res.status(200).json({
      valid,
      signed_by: valid ? 'domino-trust-broker' : null,
      receipt_id: receipt.receipt_id || null,
      tamper_detected: !valid,
    });
  } catch (err) {
    console.error('Receipt verification error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Receipt verification failed' });
  }
});

module.exports = router;
