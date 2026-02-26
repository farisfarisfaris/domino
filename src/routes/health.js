const { Router } = require('express');
const store = require('../store/memory');

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'domino-trust-broker',
    version: '0.1.0',
    registered_agents: store.getAgentCount(),
    active_sessions: store.getActiveSessionCount(),
  });
});

module.exports = router;
