const { SignJWT, jwtVerify, importPKCS8, importSPKI } = require('jose');
const crypto = require('crypto');
const { getDominoPrivateKey, getDominoPublicKey } = require('./keys');

async function createAgentCredential({ agent_id, agent_name, agent_type, owner, public_key }) {
  const privateKey = getDominoPrivateKey();
  const pubKeyThumbprint = crypto
    .createHash('sha256')
    .update(public_key)
    .digest('hex');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60; // 30 days

  const jwt = await new SignJWT({
    sub: agent_id,
    name: agent_name,
    type: agent_type,
    owner,
    pub_key_thumbprint: pubKeyThumbprint,
  })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer('domino-trust-broker')
    .sign(privateKey);

  return { jwt, issued_at: new Date(now * 1000).toISOString(), expires_at: new Date(exp * 1000).toISOString() };
}

async function verifyCredential(token) {
  const publicKey = getDominoPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'domino-trust-broker',
  });
  return payload;
}

async function createConsentToken({ scope, permissions, excluded, session_id, expires_at }) {
  const privateKey = getDominoPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.floor(new Date(expires_at).getTime() / 1000);

  const jwt = await new SignJWT({
    scope,
    permissions,
    excluded,
    session_id,
    token_type: 'consent',
  })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer('domino-trust-broker')
    .sign(privateKey);

  return jwt;
}

async function verifyConsentToken(token) {
  const publicKey = getDominoPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'domino-trust-broker',
  });
  if (payload.token_type !== 'consent') {
    throw new Error('Not a consent token');
  }
  return payload;
}

module.exports = {
  createAgentCredential,
  verifyCredential,
  createConsentToken,
  verifyConsentToken,
};
