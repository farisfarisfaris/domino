const agents = new Map();
const agentsByName = new Map();
const handshakes = new Map();
const sessions = new Map();
const receipts = new Map();
const handshakeEvents = new Map();
const scopeViolations = new Map();

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

// Collection iterators (for admin endpoints)
function getAllAgents() {
  return Array.from(agents.values());
}

function getAllHandshakes() {
  return Array.from(handshakes.values());
}

function getAllSessions() {
  return Array.from(sessions.values());
}

function getAllReceipts() {
  return Array.from(receipts.values());
}

// Handshake event log (tracks all attempts including failures)
function logHandshakeEvent(event) {
  handshakeEvents.set(event.event_id, event);
}

function getAllHandshakeEvents() {
  return Array.from(handshakeEvents.values());
}

// Scope violation log (tracks blocked actions)
function logScopeViolation(violation) {
  scopeViolations.set(violation.violation_id, violation);
}

function getAllScopeViolations() {
  return Array.from(scopeViolations.values());
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
  getAllAgents,
  getAllHandshakes,
  getAllSessions,
  getAllReceipts,
  logHandshakeEvent,
  getAllHandshakeEvents,
  logScopeViolation,
  getAllScopeViolations,
};
