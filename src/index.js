const express = require('express');
const cors = require('cors');
const { initDominoKeys, getDominoPublicKeyBase64 } = require('./crypto/keys');

// Initialize Domino's signing key pair
initDominoKeys();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const agentsRouter = require('./routes/agents');
const handshakeRouter = require('./routes/handshake');
const healthRouter = require('./routes/health');
const consentRouter = require('./routes/consent');
const interactionRouter = require('./routes/interaction');
const receiptRouter = require('./routes/receipt');

app.use('/agents', agentsRouter);
app.use('/handshake', handshakeRouter);
app.use('/health', healthRouter);
app.use('/consent', consentRouter);
app.use('/interaction', interactionRouter);
app.use('/receipt', receiptRouter);

// Public key endpoint
app.get('/domino/public-key', (req, res) => {
  res.status(200).json({
    public_key: getDominoPublicKeyBase64(),
    algorithm: 'Ed25519',
    key_id: 'domino-signing-key-v1',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  DOMINO Trust Broker v0.1.0`);
  console.log(`  Listening on port ${PORT}`);
  console.log(`  Public key: ${getDominoPublicKeyBase64().substring(0, 40)}...`);
  console.log(`\n  Endpoints:`);
  console.log(`    POST /agents/register`);
  console.log(`    POST /handshake/initiate`);
  console.log(`    POST /handshake/complete`);
  console.log(`    POST /consent/verify`);
  console.log(`    POST /interaction/record`);
  console.log(`    POST /receipt/generate`);
  console.log(`    POST /receipt/verify`);
  console.log(`    GET  /health`);
  console.log(`    GET  /domino/public-key\n`);
});
