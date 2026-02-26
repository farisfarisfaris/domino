const crypto = require('crypto');

function generateChallenge() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyChallengeResponse(signatureBase64, nonce, publicKeyBase64) {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const signature = Buffer.from(signatureBase64, 'base64');
    const data = Buffer.from(nonce, 'hex');
    return crypto.verify(null, data, publicKey, signature);
  } catch {
    return false;
  }
}

module.exports = {
  generateChallenge,
  verifyChallengeResponse,
};
