#!/usr/bin/env node

const { Buffer } = require('buffer');
const { encrypt } = require('eciesjs');
const { WebSocketTransport } = require('@metamask/mobile-wallet-protocol-core');

// yarn node scripts/sdk-connect-v2/mwp-auth-token-publish-poc.js

const MWP_BACKEND_AUTH_POC = {
  "relayUrl": "wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket",
  "sessionId": "2a513715-1434-42f7-8922-d67a735b1a15",
  "sessionChannel": "session:6980561f-5c66-41de-b723-fb0d7cc29244",
  "cliPublicKeyB64": "AvsyUb9hFpiEgVCqK0y5g0sJGImSg7NrCHB+qbV4WeXq",
  "authRequestId": "2a513715-1434-42f7-8922-d67a735b1a15:1778524108864",
  "nonce": "DZ0kLDAsApegqByeF9eXnQ==",
  "expiresAt": 1778524408864
};
const HYDRA_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjZiMjgwZGQzLTQ0ZjUtNDJmYi1hM2ZjLTA3YTI4MzBiZjJiZCIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9vaWRjLmFwaS5jeC5tZXRhbWFzay5pby9vYXV0aDIvdG9rZW4iXSwiY2xpZW50X2lkIjoiNzVmYTYyYTMtOWNhMC00YjkxLTlmZTUtNzZiZWM4NmIwMjU3IiwiZXhwIjoxNzc4NTYyNTUzLCJleHQiOnsiaHR0cHM6Ly9hdXRoZW50aWNhdGlvbi5hcGkuY3gubWV0YW1hc2suaW8vcHJvZmlsZS9hbGlhc2VzIjpbXSwiaHR0cHM6Ly9zdWJzY3JpcHRpb24uYXBpLmN4Lm1ldGFtYXNrLmlvL3Byb2R1Y3RzIjpbXX0sImlhdCI6MTc3ODQ3NjE1MiwiaXNzIjoiaHR0cHM6Ly9vaWRjLmFwaS5jeC5tZXRhbWFzay5pbyIsImp0aSI6Ijk4MTZjMDk5LWNkNTUtNGY3Yy1iNjYzLTEwMjUwNjkxNzFhNSIsIm5iZiI6MTc3ODQ3NjE1Miwic2NwIjpbXSwic3ViIjoiNmE5YmI0MTgtYzBjYS00MTU3LTlhOGItMDE0NGQ5NTAzYjFhIn0.PdRI_mx8TKIeScQxTOd_ywoR17ME9kyl4a_eOm3NOnrLg5pzpipmlUEjLfPMKapq2oQKa6tHguDfdS8Un27DEpTbLZ5n3rRxn9Pb4z0jp0QXcz7UfcCmCvBM0DQi7CLq-9_Ia9mXnQug5RXN4Vs7Jb0L-pZSgHos1It3VODg6qll4jetT1GDuue0V21-ON4HaJ2bJgoaerwL14jeFMhgPL2pBJRZLtkwbgBeOzSr1WeSGYTL_fNVmK3pM7zPzUQNdKcfj6Cagx4AVssUHosNnfksHK-uAckEyoucadWNrgL_wLe65OBkQKev5DXLPlE67-qOJ5z_kLNw8p-NtxlWTgyseE3_jT5xT4lrlkNyAbx9MbNFzTYeOgDXmD6t-wyAgsP6L0a7LINWWQah0rqp4veQzPG9GRJaUHzgJK6mo8IoWmOV4aPfsmASWateUSEKogOMT7Q3kiZMUEvRWxwYOkCL9ASqV5lfmARP2Dv6YPQyvodfSseGWdwvMkZykWcQf8PBGm5GNZ1LgWil9UHY5xYZpT-EajISCTISh9IRI-DtdAFdDWC5pb9ghpD1kG1WoI4uWRZoHXvn2Fa3k4f8zUxgifB85ZGYB7W1HZ0XAVlDuUnNu1uFHt4xa3ZZlbTNmLy4NKJd2oKl6VFsrkuyE3EugEesIUHXSWR065pioaU';

const createMemoryKVStore = () => {
  const store = new Map();

  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => {
      store.set(key, value);
    },
    delete: async (key) => {
      store.delete(key);
    },
  };
};

const main = async () => {
  if (!MWP_BACKEND_AUTH_POC || !HYDRA_TOKEN) {
    throw new Error('Paste mobile logs into MWP_BACKEND_AUTH_POC and HYDRA_TOKEN.');
  }

  const {
    relayUrl,
    sessionChannel,
    cliPublicKeyB64,
    authRequestId,
    nonce,
    sessionId,
  } = MWP_BACKEND_AUTH_POC;

  const payload = {
    type: 'message',
    payload: {
      type: 'auth-token',
      token: HYDRA_TOKEN,
      scope: 'backend-auth-poc',
      authRequestId,
      nonce,
      sessionId,
    },
  };

  const encrypted = Buffer.from(
    encrypt(
      Buffer.from(cliPublicKeyB64, 'base64'),
      Buffer.from(JSON.stringify(payload), 'utf8'),
    ),
  ).toString('base64');

  const transport = await WebSocketTransport.create({
    url: relayUrl,
    kvstore: createMemoryKVStore(),
  });

  await transport.connect();
  await transport.publish(sessionChannel, encrypted);
  await transport.disconnect();

  console.log('[MWP AUTH POC] published', { sessionChannel, authRequestId });
};

main().catch((error) => {
  console.error('[MWP AUTH POC] failed', error);
  process.exit(1);
});
