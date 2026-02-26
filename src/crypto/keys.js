const crypto = require('crypto');

let dominoKeyPair = null;

function initDominoKeys() {
  dominoKeyPair = crypto.generateKeyPairSync('ed25519');
  return dominoKeyPair;
}

function getDominoPrivateKey() {
  if (!dominoKeyPair) throw new Error('Domino keys not initialized');
  return dominoKeyPair.privateKey;
}

function getDominoPublicKey() {
  if (!dominoKeyPair) throw new Error('Domino keys not initialized');
  return dominoKeyPair.publicKey;
}

function getDominoPublicKeyBase64() {
  if (!dominoKeyPair) throw new Error('Domino keys not initialized');
  const spki = dominoKeyPair.publicKey.export({ type: 'spki', format: 'der' });
  return spki.toString('base64');
}

module.exports = {
  initDominoKeys,
  getDominoPrivateKey,
  getDominoPublicKey,
  getDominoPublicKeyBase64,
};
