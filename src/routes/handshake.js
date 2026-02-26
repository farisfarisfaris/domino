const { Router } = require('express');
const crypto = require('crypto');
const { verifyCredential, createConsentToken } = require('../crypto/jwt');
const { generateChallenge, verifyChallengeResponse } = require('../crypto/challenge');
const store = require('../store/memory');
const { getTemplate } = require('../templates/scopes');

const router = Router();

router.post('/initiate', async (req, res) => {
  try {
    const { initiator_credential, target_agent_id, requested_scope, requested_permissions, context } = req.body;

    // Validate required fields
    if (!initiator_credential) {
      return res.status(400).json({ error: 'validation_error', message: 'initiator_credential is required' });
    }
    if (!target_agent_id) {
      return res.status(400).json({ error: 'validation_error', message: 'target_agent_id is required' });
    }
    if (!requested_scope) {
      return res.status(400).json({ error: 'validation_error', message: 'requested_scope is required' });
    }

    // Verify initiator credential
    let payload;
    try {
      payload = await verifyCredential(initiator_credential);
    } catch {
      return res.status(401).json({ error: 'invalid_credential', message: 'Invalid or expired initiator credential' });
    }

    // Verify initiator agent exists and is active
    const initiator = store.getAgent(payload.sub);
    if (!initiator || initiator.status !== 'active') {
      return res.status(401).json({ error: 'invalid_credential', message: 'Initiator agent not found or inactive' });
    }

    // Verify pub_key_thumbprint matches
    const expectedThumbprint = crypto
      .createHash('sha256')
      .update(initiator.public_key)
      .digest('hex');
    if (payload.pub_key_thumbprint !== expectedThumbprint) {
      return res.status(401).json({ error: 'invalid_credential', message: 'Public key thumbprint mismatch' });
    }

    // Verify target exists and is active
    const target = store.getAgent(target_agent_id);
    if (!target) {
      return res.status(404).json({ error: 'not_found', message: 'Target agent not found' });
    }
    if (target.status !== 'active') {
      return res.status(404).json({ error: 'not_found', message: 'Target agent is not active' });
    }

    // Generate handshake
    const handshake_id = `hs_${crypto.randomBytes(6).toString('hex')}`;
    const challenge_nonce = generateChallenge();
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    store.storeHandshake({
      handshake_id,
      initiator_agent_id: payload.sub,
      target_agent_id,
      requested_scope,
      requested_permissions: requested_permissions || null,
      context: context || null,
      challenge_nonce,
      status: 'pending_target_auth',
      initiated_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    return res.status(200).json({
      handshake_id,
      status: 'pending_target_auth',
      initiator_verified: true,
      initiator_agent_id: payload.sub,
      target_agent_id,
      challenge_for_target: challenge_nonce,
      requested_scope,
      expires_at: expires.toISOString(),
    });
  } catch (err) {
    console.error('Handshake initiation error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Handshake initiation failed' });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { handshake_id, target_credential, challenge_response } = req.body;

    // Validate required fields
    if (!handshake_id) {
      return res.status(400).json({ error: 'validation_error', message: 'handshake_id is required' });
    }
    if (!target_credential) {
      return res.status(400).json({ error: 'validation_error', message: 'target_credential is required' });
    }
    if (!challenge_response) {
      return res.status(400).json({ error: 'validation_error', message: 'challenge_response is required' });
    }

    // Look up handshake
    const handshake = store.getHandshake(handshake_id);
    if (!handshake) {
      return res.status(404).json({ error: 'not_found', message: 'Handshake not found' });
    }

    // Check if already completed
    if (handshake.status === 'authenticated') {
      return res.status(409).json({ error: 'already_completed', message: 'Handshake already completed' });
    }

    // Check expiry
    if (new Date() > new Date(handshake.expires_at)) {
      store.updateHandshake(handshake_id, { status: 'expired' });
      return res.status(410).json({ error: 'expired', message: 'Handshake has expired' });
    }

    // Check status
    if (handshake.status !== 'pending_target_auth') {
      return res.status(409).json({ error: 'invalid_state', message: `Handshake is in state '${handshake.status}'` });
    }

    // Verify target credential
    let payload;
    try {
      payload = await verifyCredential(target_credential);
    } catch {
      return res.status(401).json({ error: 'invalid_credential', message: 'Invalid or expired target credential' });
    }

    // Confirm the JWT's agent_id matches the handshake's target
    if (payload.sub !== handshake.target_agent_id) {
      return res.status(401).json({ error: 'invalid_credential', message: 'Credential does not match the target agent for this handshake' });
    }

    // Verify challenge response
    const targetAgent = store.getAgent(handshake.target_agent_id);
    if (!targetAgent) {
      return res.status(401).json({ error: 'invalid_credential', message: 'Target agent not found' });
    }

    const validSignature = verifyChallengeResponse(
      challenge_response,
      handshake.challenge_nonce,
      targetAgent.public_key
    );

    if (!validSignature) {
      return res.status(401).json({ error: 'invalid_challenge_response', message: 'Challenge response signature verification failed' });
    }

    // Authentication successful — update handshake
    store.updateHandshake(handshake_id, { status: 'authenticated' });

    // Create session
    const session_id = `sess_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date();
    const sessionExpires = new Date(now.getTime() + 5 * 60 * 1000);

    const session = {
      session_id,
      handshake_id,
      initiator_agent_id: handshake.initiator_agent_id,
      target_agent_id: handshake.target_agent_id,
      scope: handshake.requested_scope,
      context: handshake.context,
      status: 'active',
      established_at: now.toISOString(),
      expires_at: sessionExpires.toISOString(),
      actions: [],
    };
    store.storeSession(session);

    // Build response
    const response = {
      handshake_id,
      status: 'authenticated',
      mutual_auth: true,
      session: {
        session_id,
        initiator_agent_id: handshake.initiator_agent_id,
        target_agent_id: handshake.target_agent_id,
        scope: handshake.requested_scope,
        established_at: now.toISOString(),
        expires_at: sessionExpires.toISOString(),
      },
    };

    // Phase 2: Generate consent token if we have scope info
    const template = getTemplate(handshake.requested_scope);
    const permissions = handshake.requested_permissions || (template ? template.default_permissions : []);
    const excluded = template ? template.default_exclusions : [];

    const consentJwt = await createConsentToken({
      scope: handshake.requested_scope,
      permissions,
      excluded,
      session_id,
      expires_at: sessionExpires.toISOString(),
    });

    // Store consent info on the session
    store.updateSession(session_id, {
      permissions,
      excluded,
      consent_token: consentJwt,
    });

    response.consent_token = {
      token: consentJwt,
      scope: handshake.requested_scope,
      permissions,
      excluded,
      session_id,
      issued_at: now.toISOString(),
      expires_at: sessionExpires.toISOString(),
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('Handshake completion error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Handshake completion failed' });
  }
});

module.exports = router;
