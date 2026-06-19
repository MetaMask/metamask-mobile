import {
  EXTENSION_ACCOUNT_SYNC_CONNECTION_TYPE_NAME,
  isExtensionAccountSyncConnectionRequest,
  tryParseExtensionAccountSyncConnectionRequest,
} from './extensionAccountSyncConnectionRequest';
import { isConnectionRequest } from '../SDKConnectV2/types/connection-request';

const validBaseRequest = () => ({
  sessionRequest: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    publicKeyB64: Buffer.alloc(33, 1).toString('base64'),
    channel: 'handshake:550e8400-e29b-41d4-a716-446655440001',
    mode: 'untrusted',
    expiresAt: Date.now() + 60_000,
  },
  metadata: {
    dapp: {
      name: 'MetaMask Extension',
      url: 'https://metamask.io',
    },
    sdk: {
      version: '1.0.0',
      platform: 'extension',
    },
  },
});

describe('extensionAccountSyncConnectionRequest', () => {
  it('accepts a valid extension account sync connection request', () => {
    const request = {
      ...validBaseRequest(),
      connectionType: {
        name: EXTENSION_ACCOUNT_SYNC_CONNECTION_TYPE_NAME,
      },
    };

    expect(isExtensionAccountSyncConnectionRequest(request)).toBe(true);
    expect(isConnectionRequest(request)).toBe(true);
  });

  it('rejects requests with a different connection type', () => {
    const request = {
      ...validBaseRequest(),
      connectionType: {
        name: 'agentic-cli',
      },
    };

    expect(isExtensionAccountSyncConnectionRequest(request)).toBe(false);
  });

  it('rejects requests without connectionType', () => {
    expect(isExtensionAccountSyncConnectionRequest(validBaseRequest())).toBe(
      false,
    );
  });

  it('returns null when tryParse receives non-string input', () => {
    expect(tryParseExtensionAccountSyncConnectionRequest(null)).toBeNull();
  });
});
