const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Domino Trust Broker API',
      version: '0.1.0',
      description:
        'The neutral trust broker for agent-to-agent interactions. Domino brokers trust between agents by providing cryptographic identity, mutual authentication, scoped consent, and signed receipts.',
      contact: {
        name: 'Domino',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
      {
        url: 'https://domino-production-9bc9.up.railway.app',
        description: 'Production (Railway)',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health and public key' },
      { name: 'Agents', description: 'Agent registration and identity' },
      { name: 'Handshake', description: 'Mutual authentication handshake' },
      { name: 'Consent', description: 'Scoped consent verification' },
      { name: 'Interaction', description: 'Interaction recording' },
      { name: 'Receipt', description: 'Signed receipt generation and verification' },
    ],
    components: {
      schemas: {
        // --- Health ---
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'domino-trust-broker' },
            version: { type: 'string', example: '0.1.0' },
            registered_agents: { type: 'integer', example: 2 },
            active_sessions: { type: 'integer', example: 1 },
          },
        },
        PublicKeyResponse: {
          type: 'object',
          properties: {
            public_key: { type: 'string', example: 'MCowBQYDK2VwAyEAz3x2JJw70VUGr2LXIZ8/AcA+...' },
            algorithm: { type: 'string', example: 'Ed25519' },
            key_id: { type: 'string', example: 'domino-signing-key-v1' },
          },
        },

        // --- Agents ---
        RegisterRequest: {
          type: 'object',
          required: ['agent_name', 'agent_type', 'owner', 'public_key'],
          properties: {
            agent_name: {
              type: 'string',
              description: 'Unique agent name (3-100 chars, lowercase alphanumeric + hyphens)',
              example: 'siri-personal-agent',
            },
            agent_type: {
              type: 'string',
              enum: ['personal', 'enterprise'],
              description: 'Type of agent',
              example: 'personal',
            },
            owner: {
              type: 'string',
              description: 'Organization that owns this agent',
              example: 'Apple',
            },
            public_key: {
              type: 'string',
              description: 'Base64-encoded Ed25519 public key (SPKI DER format)',
              example: 'MCowBQYDK2VwAyEA...',
            },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', example: 'dom_agent_a1b2c3d4' },
            agent_name: { type: 'string', example: 'siri-personal-agent' },
            agent_type: { type: 'string', example: 'personal' },
            owner: { type: 'string', example: 'Apple' },
            credential: { type: 'string', description: 'Signed JWT credential (agent passport)', example: 'eyJhbGciOiJFZERTQSJ9...' },
            issued_at: { type: 'string', format: 'date-time', example: '2026-02-25T10:00:00.000Z' },
            expires_at: { type: 'string', format: 'date-time', example: '2026-03-25T10:00:00.000Z' },
          },
        },

        // --- Handshake ---
        HandshakeInitiateRequest: {
          type: 'object',
          required: ['initiator_credential', 'target_agent_id', 'requested_scope'],
          properties: {
            initiator_credential: {
              type: 'string',
              description: 'JWT credential from registration',
              example: 'eyJhbGciOiJFZERTQSJ9...',
            },
            target_agent_id: {
              type: 'string',
              description: 'ID of the agent to handshake with',
              example: 'dom_agent_delta01',
            },
            requested_scope: {
              type: 'string',
              description: 'Intended interaction type',
              example: 'flight-rebooking',
            },
            requested_permissions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific permissions requested (optional — defaults come from scope template)',
              example: ['read_bookings', 'search_alternatives', 'request_rebooking', 'charge_payment_on_file'],
            },
            context: {
              type: 'object',
              description: 'Freeform metadata for this interaction',
              example: { user_id: 'faris-armaly', account_ref: 'SM-7741920' },
            },
          },
        },
        HandshakeInitiateResponse: {
          type: 'object',
          properties: {
            handshake_id: { type: 'string', example: 'hs_abc123def456' },
            status: { type: 'string', example: 'pending_target_auth' },
            initiator_verified: { type: 'boolean', example: true },
            initiator_agent_id: { type: 'string', example: 'dom_agent_a1b2c3d4' },
            target_agent_id: { type: 'string', example: 'dom_agent_delta01' },
            challenge_for_target: { type: 'string', description: '32-byte hex nonce the target must sign', example: '7f3a...64 hex chars' },
            requested_scope: { type: 'string', example: 'flight-rebooking' },
            expires_at: { type: 'string', format: 'date-time', example: '2026-02-25T10:05:00.000Z' },
          },
        },
        HandshakeCompleteRequest: {
          type: 'object',
          required: ['handshake_id', 'target_credential', 'challenge_response'],
          properties: {
            handshake_id: {
              type: 'string',
              description: 'The handshake to complete',
              example: 'hs_abc123def456',
            },
            target_credential: {
              type: 'string',
              description: 'Target agent JWT credential from registration',
              example: 'eyJhbGciOiJFZERTQSJ9...',
            },
            challenge_response: {
              type: 'string',
              description: 'Ed25519 signature of the challenge nonce, base64-encoded',
              example: 'NK3vZjz5Cr31mHYz...',
            },
          },
        },
        HandshakeCompleteResponse: {
          type: 'object',
          properties: {
            handshake_id: { type: 'string', example: 'hs_abc123def456' },
            status: { type: 'string', example: 'authenticated' },
            mutual_auth: { type: 'boolean', example: true },
            session: {
              type: 'object',
              properties: {
                session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
                initiator_agent_id: { type: 'string', example: 'dom_agent_a1b2c3d4' },
                target_agent_id: { type: 'string', example: 'dom_agent_delta01' },
                scope: { type: 'string', example: 'flight-rebooking' },
                established_at: { type: 'string', format: 'date-time' },
                expires_at: { type: 'string', format: 'date-time' },
              },
            },
            consent_token: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'Signed consent JWT', example: 'eyJhbGciOiJFZERTQSJ9...' },
                scope: { type: 'string', example: 'flight-rebooking' },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['read_bookings', 'search_alternatives', 'request_rebooking', 'charge_payment_on_file'],
                },
                excluded: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['loyalty_transfers', 'personal_documents', 'e_credit_access', 'account_changes'],
                },
                session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
                issued_at: { type: 'string', format: 'date-time' },
                expires_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },

        // --- Consent ---
        ConsentVerifyRequest: {
          type: 'object',
          required: ['consent_token', 'action', 'session_id'],
          properties: {
            consent_token: { type: 'string', description: 'The consent JWT to verify', example: 'eyJhbGciOiJFZERTQSJ9...' },
            action: { type: 'string', description: 'The action to check', example: 'read_bookings' },
            session_id: { type: 'string', description: 'Session this consent belongs to', example: 'sess_x1y2z3w4a5b6' },
          },
        },
        ConsentVerifyPermitted: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            action: { type: 'string', example: 'read_bookings' },
            permitted: { type: 'boolean', example: true },
            session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
            expires_at: { type: 'string', format: 'date-time' },
          },
        },
        ConsentVerifyDenied: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            action: { type: 'string', example: 'loyalty_transfers' },
            permitted: { type: 'boolean', example: false },
            reason: { type: 'string', example: "Action 'loyalty_transfers' is in the excluded list for this consent token" },
            session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
          },
        },

        // --- Interaction ---
        InteractionRecordRequest: {
          type: 'object',
          required: ['session_id', 'agent_id', 'action'],
          properties: {
            session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
            consent_token: { type: 'string', description: 'Optional — if provided, scope is enforced', example: 'eyJhbGciOiJFZERTQSJ9...' },
            agent_id: { type: 'string', description: 'The agent recording this action (must be a session participant)', example: 'dom_agent_delta01' },
            action: { type: 'string', description: 'What happened', example: 'rebooking_confirmed' },
            details: {
              type: 'object',
              description: 'Freeform action metadata',
              example: { confirmation: 'JLSJ39', new_flight: 'DL1052', fare_diff: '$0' },
            },
          },
        },
        InteractionRecordResponse: {
          type: 'object',
          properties: {
            recorded: { type: 'boolean', example: true },
            within_scope: { type: 'boolean', example: true },
            action_id: { type: 'string', example: 'act_f1e2d3c4' },
            action: { type: 'string', example: 'rebooking_confirmed' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        InteractionOutOfScope: {
          type: 'object',
          properties: {
            recorded: { type: 'boolean', example: false },
            within_scope: { type: 'boolean', example: false },
            reason: { type: 'string', example: "Action 'loyalty_transfers' is excluded by the consent token for this session" },
          },
        },

        // --- Receipt ---
        ReceiptGenerateRequest: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
          },
        },
        ReceiptResponse: {
          type: 'object',
          properties: {
            receipt_id: { type: 'string', example: 'rcpt_abc123def456' },
            handshake_id: { type: 'string', example: 'hs_abc123def456' },
            session_id: { type: 'string', example: 'sess_x1y2z3w4a5b6' },
            initiator: {
              type: 'object',
              properties: {
                agent_id: { type: 'string', example: 'dom_agent_a1b2c3d4' },
                agent_name: { type: 'string', example: 'siri-personal-agent' },
                owner: { type: 'string', example: 'Apple' },
              },
            },
            target: {
              type: 'object',
              properties: {
                agent_id: { type: 'string', example: 'dom_agent_delta01' },
                agent_name: { type: 'string', example: 'delta-service-agent' },
                owner: { type: 'string', example: 'Delta Air Lines' },
              },
            },
            scope: { type: 'string', example: 'flight-rebooking' },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action_id: { type: 'string' },
                  agent_id: { type: 'string' },
                  action: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
            outcome: { type: 'string', example: 'completed' },
            session_started: { type: 'string', format: 'date-time' },
            session_closed: { type: 'string', format: 'date-time' },
            receipt_signature: { type: 'string', description: 'Ed25519 signature over the receipt', example: 'NK3vZjz5Cr31mHYz8Q1W...' },
            domino_public_key: { type: 'string', description: "Domino's public key for independent verification", example: 'MCowBQYDK2VwAyEA...' },
          },
        },
        ReceiptVerifyRequest: {
          type: 'object',
          required: ['receipt', 'receipt_signature'],
          properties: {
            receipt: { type: 'object', description: 'The full receipt object (without receipt_signature and domino_public_key)' },
            receipt_signature: { type: 'string', description: 'The signature from the receipt', example: 'NK3vZjz5Cr31mHYz8Q1W...' },
          },
        },
        ReceiptVerifyResponse: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            signed_by: { type: 'string', example: 'domino-trust-broker', nullable: true },
            receipt_id: { type: 'string', example: 'rcpt_abc123def456', nullable: true },
            tamper_detected: { type: 'boolean', example: false },
          },
        },

        // --- Errors ---
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'validation_error' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
        AuthError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'invalid_credential' },
            message: { type: 'string', example: 'Invalid or expired credential' },
          },
        },
        NotFoundError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'not_found' },
            message: { type: 'string', example: 'Target agent not found' },
          },
        },
        ConflictError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'agent_name_taken' },
            message: { type: 'string', example: "Agent name 'siri-personal-agent' is already registered" },
          },
        },
        ExpiredError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'expired' },
            message: { type: 'string', example: 'Handshake has expired' },
          },
        },
      },
    },
    paths: {
      // ==================== Health ====================
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Returns the service status, version, and counts of registered agents and active sessions.',
          responses: {
            200: {
              description: 'Service is healthy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
            },
          },
        },
      },
      '/domino/public-key': {
        get: {
          tags: ['Health'],
          summary: "Get Domino's public key",
          description: "Returns Domino's Ed25519 public key so any party can independently verify signatures on credentials, consent tokens, and receipts.",
          responses: {
            200: {
              description: "Domino's public signing key",
              content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicKeyResponse' } } },
            },
          },
        },
      },

      // ==================== Agents ====================
      '/agents/register': {
        post: {
          tags: ['Agents'],
          summary: 'Register an agent',
          description:
            'Registers a new agent identity with Domino. The agent provides a name, type, owner, and its Ed25519 public key. Domino returns a signed JWT credential — the agent\'s "digital passport." This is called once per agent (with periodic re-registration for key rotation).',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
          },
          responses: {
            201: {
              description: 'Agent registered successfully',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } } },
            },
            400: {
              description: 'Invalid request body (missing fields, bad public key format)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
            },
            409: {
              description: 'Agent name already registered',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } } },
            },
          },
        },
      },

      // ==================== Handshake ====================
      '/handshake/initiate': {
        post: {
          tags: ['Handshake'],
          summary: 'Initiate a trust handshake',
          description:
            'The initiating agent starts a trust handshake by presenting its Domino credential and specifying the target agent. Domino verifies the credential, then generates a cryptographic challenge for the target agent. The handshake expires in 5 minutes if not completed.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HandshakeInitiateRequest' } } },
          },
          responses: {
            200: {
              description: 'Handshake initiated — challenge issued for target',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HandshakeInitiateResponse' } } },
            },
            400: {
              description: 'Missing required fields',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthError' } } },
            },
            401: {
              description: 'Invalid or expired initiator credential',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthError' } } },
            },
            404: {
              description: 'Target agent not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundError' } } },
            },
          },
        },
      },
      '/handshake/complete': {
        post: {
          tags: ['Handshake'],
          summary: 'Complete a trust handshake',
          description:
            'The target agent proves its identity by signing the challenge nonce with its private key. Domino verifies the signature against the registered public key. On success, a session and consent token are created.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HandshakeCompleteRequest' } } },
          },
          responses: {
            200: {
              description: 'Handshake complete — session established with consent token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HandshakeCompleteResponse' } } },
            },
            401: {
              description: 'Invalid credential or challenge response signature failed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthError' } } },
            },
            404: {
              description: 'Handshake not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundError' } } },
            },
            409: {
              description: 'Handshake already completed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } } },
            },
            410: {
              description: 'Handshake expired (5-minute window elapsed)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpiredError' } } },
            },
          },
        },
      },

      // ==================== Consent ====================
      '/consent/verify': {
        post: {
          tags: ['Consent'],
          summary: 'Verify a consent token',
          description:
            'Checks whether a specific action is permitted by a consent token. Returns whether the action is in the permissions list (permitted) or exclusions list (denied). Agents can also verify locally using Domino\'s public key.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConsentVerifyRequest' } } },
          },
          responses: {
            200: {
              description: 'Consent verified — action is permitted or denied',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/ConsentVerifyPermitted' },
                      { $ref: '#/components/schemas/ConsentVerifyDenied' },
                    ],
                  },
                  examples: {
                    permitted: {
                      summary: 'Action is permitted',
                      value: { valid: true, action: 'read_bookings', permitted: true, session_id: 'sess_x1y2z3w4a5b6', expires_at: '2026-02-25T10:05:30.000Z' },
                    },
                    denied: {
                      summary: 'Action is excluded',
                      value: { valid: true, action: 'loyalty_transfers', permitted: false, reason: "Action 'loyalty_transfers' is in the excluded list for this consent token", session_id: 'sess_x1y2z3w4a5b6' },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Invalid or expired consent token',
              content: { 'application/json': { schema: { type: 'object', properties: { valid: { type: 'boolean', example: false }, reason: { type: 'string', example: 'Consent token signature invalid or token expired' } } } } },
            },
          },
        },
      },

      // ==================== Interaction ====================
      '/interaction/record': {
        post: {
          tags: ['Interaction'],
          summary: 'Record an interaction action',
          description:
            'Either agent records an action taken during an active session. If a consent token is provided, Domino validates the action is within scope — excluded actions are rejected with a 403.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractionRecordRequest' } } },
          },
          responses: {
            200: {
              description: 'Action recorded successfully',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractionRecordResponse' } } },
            },
            403: {
              description: 'Action is out of scope (excluded by consent token)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractionOutOfScope' } } },
            },
            404: {
              description: 'Session not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundError' } } },
            },
            410: {
              description: 'Session has expired',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpiredError' } } },
            },
          },
        },
      },

      // ==================== Receipt ====================
      '/receipt/generate': {
        post: {
          tags: ['Receipt'],
          summary: 'Generate a signed receipt',
          description:
            'Closes the session and generates a tamper-proof, Ed25519-signed receipt of the entire interaction. Both agents get the same receipt. The receipt includes all recorded actions and can be independently verified.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReceiptGenerateRequest' } } },
          },
          responses: {
            200: {
              description: 'Receipt generated successfully',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ReceiptResponse' } } },
            },
            404: {
              description: 'Session not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundError' } } },
            },
            409: {
              description: 'Session already closed',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } } },
            },
          },
        },
      },
      '/receipt/verify': {
        post: {
          tags: ['Receipt'],
          summary: 'Verify a receipt signature',
          description:
            'Verifies a receipt is authentic and has not been tampered with. No authentication required — anyone holding a receipt can verify it. This makes receipts independently verifiable by either party, auditors, or regulators.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReceiptVerifyRequest' } } },
          },
          responses: {
            200: {
              description: 'Verification result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ReceiptVerifyResponse' },
                  examples: {
                    valid: {
                      summary: 'Receipt is authentic',
                      value: { valid: true, signed_by: 'domino-trust-broker', receipt_id: 'rcpt_abc123def456', tamper_detected: false },
                    },
                    tampered: {
                      summary: 'Tamper detected',
                      value: { valid: false, signed_by: null, receipt_id: 'rcpt_abc123def456', tamper_detected: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // We define everything inline above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
