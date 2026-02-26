const { Router } = require('express');
const crypto = require('crypto');
const { verifyConsentToken } = require('../crypto/jwt');
const store = require('../store/memory');

const router = Router();

router.post('/record', async (req, res) => {
  try {
    const { session_id, consent_token, agent_id, action, details } = req.body;

    // Validate required fields
    if (!session_id) {
      return res.status(400).json({ error: 'validation_error', message: 'session_id is required' });
    }
    if (!agent_id) {
      return res.status(400).json({ error: 'validation_error', message: 'agent_id is required' });
    }
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'validation_error', message: 'action is required and must be a string' });
    }

    // Validate session exists and is active
    const session = store.getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'invalid_state', message: `Session is in state '${session.status}'` });
    }

    // Check session expiry
    if (new Date() > new Date(session.expires_at)) {
      store.updateSession(session_id, { status: 'expired' });
      return res.status(410).json({ error: 'expired', message: 'Session has expired' });
    }

    // Verify agent is part of this session
    if (agent_id !== session.initiator_agent_id && agent_id !== session.target_agent_id) {
      return res.status(403).json({ error: 'forbidden', message: 'Agent is not a participant in this session' });
    }

    // If consent token provided, verify scope
    if (consent_token) {
      try {
        const payload = await verifyConsentToken(consent_token);

        if (payload.session_id !== session_id) {
          return res.status(401).json({ error: 'invalid_token', message: 'Consent token does not match this session' });
        }

        // Check excluded actions
        if (payload.excluded && payload.excluded.includes(action)) {
          const actingAgent = store.getAgent(agent_id);
          store.logScopeViolation({
            violation_id: `sv_${crypto.randomBytes(4).toString('hex')}`,
            timestamp: new Date().toISOString(),
            session_id,
            agent_id,
            agent_name: actingAgent ? actingAgent.agent_name : null,
            attempted_action: action,
            scope: session.scope,
            result: 'blocked',
          });
          return res.status(403).json({
            recorded: false,
            within_scope: false,
            reason: `Action '${action}' is excluded by the consent token for this session`,
          });
        }
      } catch {
        return res.status(401).json({ error: 'invalid_token', message: 'Invalid or expired consent token' });
      }
    }

    // Record the action
    const action_id = `act_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const actionRecord = {
      action_id,
      agent_id,
      action,
      details: details || {},
      timestamp,
    };

    session.actions.push(actionRecord);

    return res.status(200).json({
      recorded: true,
      within_scope: true,
      action_id,
      action,
      timestamp,
    });
  } catch (err) {
    console.error('Interaction record error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Recording failed' });
  }
});

module.exports = router;
