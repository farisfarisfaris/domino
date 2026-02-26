const agents = new Map();
const agentsByName = new Map();
const handshakes = new Map();
const sessions = new Map();
const receipts = new Map();

// Agents
function storeAgent(agent) {
  agents.set(agent.agent_id, agent);
  agentsByName.set(agent.agent_name, agent.agent_id);
}

function getAgent(agentId) {
  return agents.get(agentId) || null;
}

function getAgentByName(name) {
  const id = agentsByName.get(name);
  return id ? agents.get(id) : null;
}

function agentNameExists(name) {
  return agentsByName.has(name);
}

function getAgentCount() {
  return agents.size;
}

// Handshakes
function storeHandshake(handshake) {
  handshakes.set(handshake.handshake_id, handshake);
}

function getHandshake(handshakeId) {
  return handshakes.get(handshakeId) || null;
}

function updateHandshake(handshakeId, updates) {
  const hs = handshakes.get(handshakeId);
  if (!hs) return null;
  Object.assign(hs, updates);
  return hs;
}

// Sessions
function storeSession(session) {
  sessions.set(session.session_id, session);
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function updateSession(sessionId, updates) {
  const sess = sessions.get(sessionId);
  if (!sess) return null;
  Object.assign(sess, updates);
  return sess;
}

function getActiveSessionCount() {
  let count = 0;
  for (const sess of sessions.values()) {
    if (sess.status === 'active') count++;
  }
  return count;
}

// Receipts
function storeReceipt(receipt) {
  receipts.set(receipt.receipt_id, receipt);
}

function getReceipt(receiptId) {
  return receipts.get(receiptId) || null;
}

module.exports = {
  storeAgent,
  getAgent,
  getAgentByName,
  agentNameExists,
  getAgentCount,
  storeHandshake,
  getHandshake,
  updateHandshake,
  storeSession,
  getSession,
  updateSession,
  getActiveSessionCount,
  storeReceipt,
  getReceipt,
};
