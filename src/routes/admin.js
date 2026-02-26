const { Router } = require('express');
const crypto = require('crypto');
const { decodeJwt } = require('jose');
const store = require('../store/memory');
const adminAuth = require('../middleware/adminAuth');

const router = Router();
router.use(adminAuth);

// Helper: resolve agent info, handling deleted agents
function resolveAgent(agentId) {
  const agent = store.getAgent(agentId);
  if (!agent) {
    return { agent_id: agentId, agent_name: 'unknown', agent_type: null, owner: 'unknown' };
  }
  return {
    agent_id: agent.agent_id,
    agent_name: agent.agent_name,
    agent_type: agent.agent_type,
    owner: agent.owner,
  };
}

// Helper: find receipt for a session
function findReceiptForSession(sessionId) {
  const allReceipts = store.getAllReceipts();
  return allReceipts.find(r => r.session_id === sessionId) || null;
}

// Helper: compute duration in ms
function computeDurationMs(session) {
  const start = new Date(session.established_at).getTime();
  if (session.closed_at) {
    return new Date(session.closed_at).getTime() - start;
  }
  if (session.status === 'active') {
    return Date.now() - start;
  }
  // For expired/other sessions without closed_at, use expires_at as approximation
  if (session.expires_at) {
    return new Date(session.expires_at).getTime() - start;
  }
  return null;
}

// GET /admin/stats
router.get('/stats', (req, res) => {
  try {
    const allAgents = store.getAllAgents();
    const allSessions = store.getAllSessions();
    const allEvents = store.getAllHandshakeEvents();
    const allReceipts = store.getAllReceipts();
    const allViolations = store.getAllScopeViolations();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Agent counts
    const activeAgents = allAgents.filter(a => a.status === 'active').length;
    const byType = { personal: 0, enterprise: 0 };
    for (const agent of allAgents) {
      if (byType[agent.agent_type] !== undefined) byType[agent.agent_type]++;
    }

    // Active sessions
    const activeSessions = allSessions.filter(s => s.status === 'active').length;

    // Handshakes in 24h
    const recentEvents = allEvents.filter(e => e.timestamp >= twentyFourHoursAgo);
    const successful24h = recentEvents.filter(e => e.success).length;
    const failed24h = recentEvents.filter(e => !e.success).length;
    const total24h = recentEvents.length;
    const successRate = total24h > 0 ? Math.round((successful24h / total24h) * 10000) / 100 : null;

    // Receipts in 24h
    const receipts24h = allReceipts.filter(r => r.session_closed >= twentyFourHoursAgo).length;

    // Scope violations in 24h
    const violations24h = allViolations.filter(v => v.timestamp >= twentyFourHoursAgo).length;

    return res.status(200).json({
      agents: {
        total: allAgents.length,
        active: activeAgents,
        by_type: byType,
      },
      active_sessions: activeSessions,
      handshakes_24h: {
        total: total24h,
        successful: successful24h,
        failed: failed24h,
        success_rate: successRate,
      },
      blocked_24h: failed24h,
      receipts_24h: receipts24h,
      scope_violations_24h: violations24h,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to generate stats' });
  }
});

// GET /admin/agents
router.get('/agents', (req, res) => {
  try {
    const { status, type, search } = req.query;

    let agents = store.getAllAgents();
    const allSessions = store.getAllSessions();

    // Filters
    if (status) {
      agents = agents.filter(a => a.status === status);
    }
    if (type) {
      agents = agents.filter(a => a.agent_type === type);
    }
    if (search) {
      const term = search.toLowerCase();
      agents = agents.filter(a =>
        a.agent_name.toLowerCase().includes(term) ||
        (a.owner && a.owner.toLowerCase().includes(term))
      );
    }

    // Enrich with session count and last active
    const enriched = agents.map(agent => {
      const agentSessions = allSessions.filter(
        s => s.initiator_agent_id === agent.agent_id || s.target_agent_id === agent.agent_id
      );
      const sessionCount = agentSessions.length;

      let lastActive = null;
      for (const sess of agentSessions) {
        if (!lastActive || sess.established_at > lastActive) {
          lastActive = sess.established_at;
        }
      }

      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        agent_type: agent.agent_type,
        owner: agent.owner,
        status: agent.status,
        registered_at: agent.registered_at,
        session_count: sessionCount,
        last_active: lastActive,
      };
    });

    // Sort by registered_at descending (most recent first)
    enriched.sort((a, b) => (b.registered_at || '').localeCompare(a.registered_at || ''));

    return res.status(200).json({
      agents: enriched,
      total: enriched.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin agents list error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to list agents' });
  }
});

// GET /admin/agents/:id
router.get('/agents/:id', (req, res) => {
  try {
    const agent = store.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'not_found', message: 'Agent not found' });
    }

    const allSessions = store.getAllSessions();
    const allEvents = store.getAllHandshakeEvents();

    // Public key thumbprint
    const publicKeyThumbprint = crypto
      .createHash('sha256')
      .update(agent.public_key)
      .digest('hex');

    // Decode credential to get expiry
    let credentialExpiresAt = null;
    try {
      const decoded = decodeJwt(agent.credential);
      if (decoded.exp) {
        credentialExpiresAt = new Date(decoded.exp * 1000).toISOString();
      }
    } catch {
      // credential may be invalid/expired — that's fine, just skip
    }

    // Sessions involving this agent
    const agentSessions = allSessions
      .filter(s => s.initiator_agent_id === agent.agent_id || s.target_agent_id === agent.agent_id)
      .map(s => {
        const isInitiator = s.initiator_agent_id === agent.agent_id;
        const counterpartId = isInitiator ? s.target_agent_id : s.initiator_agent_id;
        const counterpart = store.getAgent(counterpartId);

        return {
          session_id: s.session_id,
          role: isInitiator ? 'initiator' : 'target',
          counterpart_agent_id: counterpartId,
          counterpart_agent_name: counterpart ? counterpart.agent_name : 'unknown',
          scope: s.scope,
          status: s.status,
          action_count: s.actions ? s.actions.length : 0,
          established_at: s.established_at,
          duration_ms: computeDurationMs(s),
        };
      })
      .sort((a, b) => (b.established_at || '').localeCompare(a.established_at || ''));

    // Handshake events involving this agent
    const agentEvents = allEvents
      .filter(e => e.initiator_agent_id === agent.agent_id || e.target_agent_id === agent.agent_id)
      .map(e => {
        const isInitiator = e.initiator_agent_id === agent.agent_id;
        const counterpartName = isInitiator ? e.target_agent_name : e.initiator_agent_name;

        return {
          event_id: e.event_id,
          type: e.type,
          timestamp: e.timestamp,
          handshake_id: e.handshake_id,
          role: isInitiator ? 'initiator' : 'target',
          counterpart_agent_name: counterpartName || 'unknown',
          requested_scope: e.requested_scope,
          success: e.success,
          error_code: e.error_code,
        };
      })
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    // Last active
    let lastActive = null;
    for (const sess of agentSessions) {
      if (!lastActive || sess.established_at > lastActive) {
        lastActive = sess.established_at;
      }
    }

    return res.status(200).json({
      agent: {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        agent_type: agent.agent_type,
        owner: agent.owner,
        status: agent.status,
        public_key: agent.public_key,
        public_key_thumbprint: publicKeyThumbprint,
        registered_at: agent.registered_at,
        credential_expires_at: credentialExpiresAt,
      },
      sessions: agentSessions,
      handshake_events: agentEvents,
      session_count: agentSessions.length,
      last_active: lastActive,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin agent detail error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to get agent details' });
  }
});

// GET /admin/sessions
router.get('/sessions', (req, res) => {
  try {
    const { status, scope, agent_id } = req.query;

    let sessions = store.getAllSessions();
    const allReceipts = store.getAllReceipts();

    // Filters
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }
    if (scope) {
      sessions = sessions.filter(s => s.scope === scope);
    }
    if (agent_id) {
      sessions = sessions.filter(s =>
        s.initiator_agent_id === agent_id || s.target_agent_id === agent_id
      );
    }

    // Enrich
    const enriched = sessions.map(s => {
      const receipt = allReceipts.find(r => r.session_id === s.session_id);

      return {
        session_id: s.session_id,
        handshake_id: s.handshake_id,
        initiator: resolveAgent(s.initiator_agent_id),
        target: resolveAgent(s.target_agent_id),
        scope: s.scope,
        status: s.status,
        action_count: s.actions ? s.actions.length : 0,
        established_at: s.established_at,
        expires_at: s.expires_at,
        closed_at: s.closed_at || null,
        duration_ms: computeDurationMs(s),
        has_receipt: !!receipt,
        receipt_id: receipt ? receipt.receipt_id : null,
      };
    });

    // Sort by established_at descending
    enriched.sort((a, b) => (b.established_at || '').localeCompare(a.established_at || ''));

    return res.status(200).json({
      sessions: enriched,
      total: enriched.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin sessions list error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to list sessions' });
  }
});

// GET /admin/sessions/:id
router.get('/sessions/:id', (req, res) => {
  try {
    const session = store.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'Session not found' });
    }

    const receipt = findReceiptForSession(session.session_id);

    // Enrich actions with agent names
    const enrichedActions = (session.actions || []).map(a => {
      const actingAgent = store.getAgent(a.agent_id);
      return {
        ...a,
        agent_name: actingAgent ? actingAgent.agent_name : 'unknown',
      };
    });

    return res.status(200).json({
      session: {
        session_id: session.session_id,
        handshake_id: session.handshake_id,
        initiator: resolveAgent(session.initiator_agent_id),
        target: resolveAgent(session.target_agent_id),
        scope: session.scope,
        context: session.context || null,
        status: session.status,
        established_at: session.established_at,
        expires_at: session.expires_at,
        closed_at: session.closed_at || null,
        consent: {
          permissions: session.permissions || [],
          excluded: session.excluded || [],
          has_token: !!session.consent_token,
        },
        actions: enrichedActions,
        action_count: enrichedActions.length,
        receipt: receipt ? {
          receipt_id: receipt.receipt_id,
          outcome: receipt.outcome,
          generated_at: receipt.session_closed,
        } : null,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin session detail error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to get session details' });
  }
});

// GET /admin/receipts
router.get('/receipts', (req, res) => {
  try {
    const { scope } = req.query;

    let receipts = store.getAllReceipts();

    if (scope) {
      receipts = receipts.filter(r => r.scope === scope);
    }

    const enriched = receipts.map(r => ({
      receipt_id: r.receipt_id,
      handshake_id: r.handshake_id,
      session_id: r.session_id,
      initiator: {
        agent_id: r.initiator.agent_id,
        agent_name: r.initiator.agent_name,
      },
      target: {
        agent_id: r.target.agent_id,
        agent_name: r.target.agent_name,
      },
      scope: r.scope,
      action_count: r.actions ? r.actions.length : 0,
      outcome: r.outcome,
      session_started: r.session_started,
      session_closed: r.session_closed,
    }));

    // Sort by session_closed descending
    enriched.sort((a, b) => (b.session_closed || '').localeCompare(a.session_closed || ''));

    return res.status(200).json({
      receipts: enriched,
      total: enriched.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin receipts list error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to list receipts' });
  }
});

// GET /admin/receipts/:id
router.get('/receipts/:id', (req, res) => {
  try {
    const receipt = store.getReceipt(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'not_found', message: 'Receipt not found' });
    }

    return res.status(200).json({
      receipt: {
        receipt_id: receipt.receipt_id,
        handshake_id: receipt.handshake_id,
        session_id: receipt.session_id,
        initiator: receipt.initiator,
        target: receipt.target,
        scope: receipt.scope,
        actions: receipt.actions,
        outcome: receipt.outcome,
        session_started: receipt.session_started,
        session_closed: receipt.session_closed,
        receipt_signature: receipt.receipt_signature,
        domino_public_key: receipt.domino_public_key,
        signing_algorithm: 'Ed25519',
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin receipt detail error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to get receipt details' });
  }
});

// GET /admin/handshakes
router.get('/handshakes', (req, res) => {
  try {
    const { status, type, agent_id, scope, limit } = req.query;

    let events = store.getAllHandshakeEvents();

    // Filters
    if (status === 'success') {
      events = events.filter(e => e.success);
    } else if (status === 'failed') {
      events = events.filter(e => !e.success);
    }

    if (type) {
      events = events.filter(e => e.type === type);
    }

    if (agent_id) {
      events = events.filter(e =>
        e.initiator_agent_id === agent_id || e.target_agent_id === agent_id
      );
    }

    if (scope) {
      events = events.filter(e => e.requested_scope === scope);
    }

    // Sort by timestamp descending
    events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const total = events.length;

    // Apply limit
    const maxResults = limit ? parseInt(limit, 10) : 100;
    if (maxResults > 0 && events.length > maxResults) {
      events = events.slice(0, maxResults);
    }

    return res.status(200).json({
      handshake_events: events,
      total,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin handshakes error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to list handshake events' });
  }
});

// GET /admin/scope-violations
router.get('/scope-violations', (req, res) => {
  try {
    const { session_id, agent_id } = req.query;

    let violations = store.getAllScopeViolations();

    if (session_id) {
      violations = violations.filter(v => v.session_id === session_id);
    }

    if (agent_id) {
      violations = violations.filter(v => v.agent_id === agent_id);
    }

    // Sort by timestamp descending
    violations.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return res.status(200).json({
      violations,
      total: violations.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin scope violations error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to list scope violations' });
  }
});

module.exports = router;
