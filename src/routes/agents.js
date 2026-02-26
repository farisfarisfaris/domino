const { Router } = require('express');
const crypto = require('crypto');
const { createAgentCredential } = require('../crypto/jwt');
const store = require('../store/memory');

const router = Router();

const AGENT_NAME_REGEX = /^[a-z0-9-]+$/;

function validatePublicKey(base64Key) {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(base64Key, 'base64'),
      format: 'der',
      type: 'spki',
    });
    return key.asymmetricKeyType === 'ed25519';
  } catch {
    return false;
  }
}

router.post('/register', async (req, res) => {
  try {
    const { agent_name, agent_type, owner, public_key } = req.body;

    // Validate required fields
    const errors = [];
    if (!agent_name || typeof agent_name !== 'string') {
      errors.push('agent_name is required and must be a string');
    } else if (agent_name.length < 3 || agent_name.length > 100) {
      errors.push('agent_name must be between 3 and 100 characters');
    } else if (!AGENT_NAME_REGEX.test(agent_name)) {
      errors.push('agent_name must contain only lowercase alphanumeric characters and hyphens');
    }

    if (!agent_type || !['personal', 'enterprise'].includes(agent_type)) {
      errors.push('agent_type is required and must be "personal" or "enterprise"');
    }

    if (!owner || typeof owner !== 'string') {
      errors.push('owner is required and must be a string');
    }

    if (!public_key || typeof public_key !== 'string') {
      errors.push('public_key is required and must be a base64-encoded Ed25519 public key');
    } else if (!validatePublicKey(public_key)) {
      errors.push('public_key must be a valid base64-encoded Ed25519 public key');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'validation_error', details: errors });
    }

    // Check uniqueness
    if (store.agentNameExists(agent_name)) {
      return res.status(409).json({ error: 'agent_name_taken', message: `Agent name '${agent_name}' is already registered` });
    }

    // Generate agent ID
    const agent_id = `dom_agent_${crypto.randomBytes(4).toString('hex')}`;

    // Create credential JWT
    const { jwt: credential, issued_at, expires_at } = await createAgentCredential({
      agent_id,
      agent_name,
      agent_type,
      owner,
      public_key,
    });

    // Store
    store.storeAgent({
      agent_id,
      agent_name,
      agent_type,
      owner,
      public_key,
      credential,
      registered_at: issued_at,
      status: 'active',
    });

    return res.status(201).json({
      agent_id,
      agent_name,
      agent_type,
      owner,
      credential,
      issued_at,
      expires_at,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Registration failed' });
  }
});

module.exports = router;
