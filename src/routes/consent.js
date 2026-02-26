const { Router } = require('express');
const { verifyConsentToken } = require('../crypto/jwt');

const router = Router();

router.post('/verify', async (req, res) => {
  try {
    const { consent_token, action, session_id } = req.body;

    if (!consent_token) {
      return res.status(400).json({ error: 'validation_error', message: 'consent_token is required' });
    }
    if (!action) {
      return res.status(400).json({ error: 'validation_error', message: 'action is required' });
    }
    if (!session_id) {
      return res.status(400).json({ error: 'validation_error', message: 'session_id is required' });
    }

    // Verify the consent token JWT
    let payload;
    try {
      payload = await verifyConsentToken(consent_token);
    } catch {
      return res.status(401).json({ valid: false, reason: 'Consent token signature invalid or token expired' });
    }

    // Check session_id matches
    if (payload.session_id !== session_id) {
      return res.status(401).json({ valid: false, reason: 'Session ID does not match consent token' });
    }

    // Check if action is in excluded list
    if (payload.excluded && payload.excluded.includes(action)) {
      return res.status(200).json({
        valid: true,
        action,
        permitted: false,
        reason: `Action '${action}' is in the excluded list for this consent token`,
        session_id,
      });
    }

    // Check if action is in permissions list
    const permitted = payload.permissions && payload.permissions.includes(action);

    if (permitted) {
      return res.status(200).json({
        valid: true,
        action,
        permitted: true,
        session_id,
        expires_at: new Date(payload.exp * 1000).toISOString(),
      });
    }

    // Action not in permissions and not in excluded — not permitted
    return res.status(200).json({
      valid: true,
      action,
      permitted: false,
      reason: `Action '${action}' is not in the permissions list for this consent token`,
      session_id,
    });
  } catch (err) {
    console.error('Consent verification error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Consent verification failed' });
  }
});

module.exports = router;
