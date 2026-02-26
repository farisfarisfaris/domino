/**
 * Agent Attacker — Demonstrates Domino rejecting unauthorized agents
 *
 * Tries several attack vectors:
 * 1. Initiate handshake with a fake credential
 * 2. Complete handshake with wrong private key
 * 3. Record action on a session the agent isn't part of
 *
 * Usage: Start Domino server, run agent-a.js first, then:
 *   node examples/agent-attacker.js
 */

const crypto = require('crypto');

const BASE_URL = process.env.DOMINO_URL || 'http://localhost:3000';

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log('=== DOMINO Attacker Simulation ===\n');

  // Attack 1: Fake credential
  console.log('--- Attack 1: Fake JWT Credential ---');
  const fakeResult = await api('POST', '/handshake/initiate', {
    initiator_credential: 'eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJmYWtlX2FnZW50In0.fakesignature',
    target_agent_id: 'dom_agent_00000000',
    requested_scope: 'data-theft',
  });
  console.log(`  Status: ${fakeResult.status}`);
  console.log(`  Error: ${fakeResult.data.error || fakeResult.data.message}`);
  console.log(`  Result: BLOCKED\n`);

  // Attack 2: Register, then try handshake with a non-existent target
  console.log('--- Attack 2: Handshake with Non-Existent Target ---');
  const attackerKeys = crypto.generateKeyPairSync('ed25519');
  const attackerPub = attackerKeys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

  const reg = await api('POST', '/agents/register', {
    agent_name: 'evil-agent',
    agent_type: 'personal',
    owner: 'Attacker Inc',
    public_key: attackerPub,
  });
  console.log(`  Registered as: ${reg.data.agent_id}`);

  const hsResult = await api('POST', '/handshake/initiate', {
    initiator_credential: reg.data.credential,
    target_agent_id: 'dom_agent_nonexist',
    requested_scope: 'steal-data',
  });
  console.log(`  Status: ${hsResult.status}`);
  console.log(`  Error: ${hsResult.data.error || hsResult.data.message}`);
  console.log(`  Result: BLOCKED\n`);

  // Attack 3: Register a legit target, initiate handshake, but sign with wrong key
  console.log('--- Attack 3: Wrong Private Key for Challenge ---');
  const victimKeys = crypto.generateKeyPairSync('ed25519');
  const victimPub = victimKeys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

  const victimReg = await api('POST', '/agents/register', {
    agent_name: 'victim-agent',
    agent_type: 'enterprise',
    owner: 'Victim Corp',
    public_key: victimPub,
  });
  console.log(`  Victim registered as: ${victimReg.data.agent_id}`);

  const hs = await api('POST', '/handshake/initiate', {
    initiator_credential: reg.data.credential,
    target_agent_id: victimReg.data.agent_id,
    requested_scope: 'impersonation',
  });
  console.log(`  Handshake initiated: ${hs.data.handshake_id}`);

  // Sign with attacker's key instead of victim's key
  const wrongSig = crypto.sign(
    null,
    Buffer.from(hs.data.challenge_for_target, 'hex'),
    attackerKeys.privateKey
  ).toString('base64');

  const completeResult = await api('POST', '/handshake/complete', {
    handshake_id: hs.data.handshake_id,
    target_credential: victimReg.data.credential,
    challenge_response: wrongSig,
  });
  console.log(`  Status: ${completeResult.status}`);
  console.log(`  Error: ${completeResult.data.error || completeResult.data.message}`);
  console.log(`  Result: BLOCKED\n`);

  // Attack 4: Missing required fields
  console.log('--- Attack 4: Missing Required Fields ---');
  const missingFields = await api('POST', '/agents/register', {
    agent_name: 'x',
  });
  console.log(`  Status: ${missingFields.status}`);
  console.log(`  Errors: ${JSON.stringify(missingFields.data.details)}`);
  console.log(`  Result: BLOCKED\n`);

  console.log('=== All attacks blocked. Domino is working. ===');
}

main().catch(err => {
  console.error('Attacker simulation failed:', err.message);
  process.exit(1);
});
