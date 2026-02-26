/**
 * Agent A — Personal Agent (Initiator)
 *
 * Full E2E flow:
 * 1. Registers with Domino
 * 2. Initiates handshake with Agent B
 * 3. Agent B completes handshake (run agent-b.js in sequence)
 * 4. Records actions
 * 5. Generates and verifies receipt
 *
 * Usage: First start the Domino server, then run:
 *   node examples/agent-a.js
 *
 * This script runs the full flow by orchestrating both agents internally.
 */

const crypto = require('crypto');

const BASE_URL = process.env.DOMINO_URL || 'http://localhost:3000';

// Generate Ed25519 key pairs for both agents
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey,
  };
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok && res.status >= 500) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

function signChallenge(challengeHex, privateKey) {
  const data = Buffer.from(challengeHex, 'hex');
  return crypto.sign(null, data, privateKey).toString('base64');
}

async function main() {
  console.log('=== DOMINO E2E Flow ===\n');

  // Step 1: Generate key pairs
  const agentA = generateKeyPair();
  const agentB = generateKeyPair();
  console.log('Generated key pairs for Agent A and Agent B\n');

  // Step 2: Register Agent A (personal agent)
  console.log('--- Registering Agent A ---');
  const regA = await api('POST', '/agents/register', {
    agent_name: 'siri-personal-agent',
    agent_type: 'personal',
    owner: 'Apple',
    public_key: agentA.publicKey,
  });
  console.log(`  Status: ${regA.status}`);
  console.log(`  Agent ID: ${regA.data.agent_id}`);
  console.log(`  Credential: ${regA.data.credential.substring(0, 50)}...`);
  console.log();

  // Step 3: Register Agent B (enterprise agent)
  console.log('--- Registering Agent B ---');
  const regB = await api('POST', '/agents/register', {
    agent_name: 'delta-service-agent',
    agent_type: 'enterprise',
    owner: 'Delta Air Lines',
    public_key: agentB.publicKey,
  });
  console.log(`  Status: ${regB.status}`);
  console.log(`  Agent ID: ${regB.data.agent_id}`);
  console.log(`  Credential: ${regB.data.credential.substring(0, 50)}...`);
  console.log();

  // Step 4: Agent A initiates handshake
  console.log('--- Agent A Initiates Handshake ---');
  const hs = await api('POST', '/handshake/initiate', {
    initiator_credential: regA.data.credential,
    target_agent_id: regB.data.agent_id,
    requested_scope: 'flight-rebooking',
    requested_permissions: [
      'read_bookings',
      'search_alternatives',
      'request_rebooking',
      'charge_payment_on_file',
    ],
    context: {
      user_id: 'faris-armaly',
      account_ref: 'SM-7741920',
    },
  });
  console.log(`  Status: ${hs.status}`);
  console.log(`  Handshake ID: ${hs.data.handshake_id}`);
  console.log(`  Initiator verified: ${hs.data.initiator_verified}`);
  console.log(`  Challenge: ${hs.data.challenge_for_target.substring(0, 20)}...`);
  console.log();

  // Step 5: Agent B signs challenge and completes handshake
  console.log('--- Agent B Completes Handshake ---');
  const challengeResponse = signChallenge(hs.data.challenge_for_target, agentB.privateKey);

  const complete = await api('POST', '/handshake/complete', {
    handshake_id: hs.data.handshake_id,
    target_credential: regB.data.credential,
    challenge_response: challengeResponse,
  });
  console.log(`  Status: ${complete.status}`);
  console.log(`  Mutual auth: ${complete.data.mutual_auth}`);
  console.log(`  Session ID: ${complete.data.session.session_id}`);
  console.log(`  Scope: ${complete.data.session.scope}`);
  console.log(`  Consent permissions: ${complete.data.consent_token.permissions.join(', ')}`);
  console.log(`  Consent excluded: ${complete.data.consent_token.excluded.join(', ')}`);
  console.log();

  const session_id = complete.data.session.session_id;
  const consent_token = complete.data.consent_token.token;

  // Step 6: Verify consent for a permitted action
  console.log('--- Verify Consent: read_bookings ---');
  const consentOk = await api('POST', '/consent/verify', {
    consent_token,
    action: 'read_bookings',
    session_id,
  });
  console.log(`  Permitted: ${consentOk.data.permitted}`);
  console.log();

  // Step 7: Verify consent for an excluded action
  console.log('--- Verify Consent: loyalty_transfers (excluded) ---');
  const consentDeny = await api('POST', '/consent/verify', {
    consent_token,
    action: 'loyalty_transfers',
    session_id,
  });
  console.log(`  Permitted: ${consentDeny.data.permitted}`);
  console.log(`  Reason: ${consentDeny.data.reason}`);
  console.log();

  // Step 8: Record interactions
  console.log('--- Recording Actions ---');

  const act1 = await api('POST', '/interaction/record', {
    session_id,
    consent_token,
    agent_id: regA.data.agent_id,
    action: 'bookings_retrieved',
    details: { booking_count: 3 },
  });
  console.log(`  [${act1.data.action_id}] ${act1.data.action} — recorded: ${act1.data.recorded}`);

  const act2 = await api('POST', '/interaction/record', {
    session_id,
    consent_token,
    agent_id: regA.data.agent_id,
    action: 'alternatives_searched',
    details: { alternatives_found: 5 },
  });
  console.log(`  [${act2.data.action_id}] ${act2.data.action} — recorded: ${act2.data.recorded}`);

  const act3 = await api('POST', '/interaction/record', {
    session_id,
    consent_token,
    agent_id: regB.data.agent_id,
    action: 'rebooking_confirmed',
    details: { confirmation: 'JLSJ39', new_flight: 'DL1052', fare_diff: '$0' },
  });
  console.log(`  [${act3.data.action_id}] ${act3.data.action} — recorded: ${act3.data.recorded}`);
  console.log();

  // Step 9: Try an excluded action
  console.log('--- Attempt Excluded Action: loyalty_transfers ---');
  const actDeny = await api('POST', '/interaction/record', {
    session_id,
    consent_token,
    agent_id: regA.data.agent_id,
    action: 'loyalty_transfers',
    details: {},
  });
  console.log(`  Recorded: ${actDeny.data.recorded}`);
  console.log(`  Reason: ${actDeny.data.reason}`);
  console.log();

  // Step 10: Generate receipt
  console.log('--- Generating Receipt ---');
  const receipt = await api('POST', '/receipt/generate', { session_id });
  console.log(`  Receipt ID: ${receipt.data.receipt_id}`);
  console.log(`  Initiator: ${receipt.data.initiator.agent_name} (${receipt.data.initiator.owner})`);
  console.log(`  Target: ${receipt.data.target.agent_name} (${receipt.data.target.owner})`);
  console.log(`  Scope: ${receipt.data.scope}`);
  console.log(`  Actions: ${receipt.data.actions.length}`);
  console.log(`  Outcome: ${receipt.data.outcome}`);
  console.log(`  Signature: ${receipt.data.receipt_signature.substring(0, 40)}...`);
  console.log();

  // Step 11: Verify receipt
  console.log('--- Verifying Receipt ---');
  const { receipt_signature, domino_public_key, ...receiptBody } = receipt.data;
  const verify = await api('POST', '/receipt/verify', {
    receipt: receiptBody,
    receipt_signature,
  });
  console.log(`  Valid: ${verify.data.valid}`);
  console.log(`  Signed by: ${verify.data.signed_by}`);
  console.log(`  Tamper detected: ${verify.data.tamper_detected}`);
  console.log();

  // Step 12: Tamper with receipt and verify again
  console.log('--- Verifying Tampered Receipt ---');
  const tamperedReceipt = { ...receiptBody, outcome: 'failed' };
  const verifyTampered = await api('POST', '/receipt/verify', {
    receipt: tamperedReceipt,
    receipt_signature,
  });
  console.log(`  Valid: ${verifyTampered.data.valid}`);
  console.log(`  Tamper detected: ${verifyTampered.data.tamper_detected}`);
  console.log();

  // Step 13: Check health
  console.log('--- Health Check ---');
  const health = await api('GET', '/health');
  console.log(`  Status: ${health.data.status}`);
  console.log(`  Registered agents: ${health.data.registered_agents}`);
  console.log(`  Active sessions: ${health.data.active_sessions}`);
  console.log();

  console.log('=== E2E Flow Complete ===');
}

main().catch(err => {
  console.error('E2E flow failed:', err.message);
  process.exit(1);
});
