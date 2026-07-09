import {
  isAgenticCliConnectionRequest,
  isAgenticCliLoginOperation,
  type AgenticCliConnectionRequest,
} from './agenticCliConnectionRequest';

function make33ByteB64(): string {
  const buf = Buffer.alloc(33, 0x02);
  return buf.toString('base64');
}

function validAgenticRequest(
  overrides: Record<string, unknown> = {},
): AgenticCliConnectionRequest {
  return {
    sessionRequest: {
      id: '11111111-2222-3333-4444-555555555555',
      publicKeyB64: make33ByteB64(),
      channel: 'handshake:aabbccdd-1122-3344-5566-778899aabbcc',
      mode: 'trusted',
      expiresAt: Date.now() + 60_000,
      ...(overrides.sessionRequest as Record<string, unknown>),
    },
    metadata: {
      dapp: {
        name: 'Test DApp',
        url: 'https://test.dapp',
        ...(overrides.dapp as Record<string, unknown>),
      },
      sdk: {
        version: '2.0.0',
        platform: 'JavaScript',
        ...(overrides.sdk as Record<string, unknown>),
      },
      ...(overrides.metadata as Record<string, unknown>),
    },
    connectionType: {
      name: 'agentic-cli',
      ...(overrides.connectionType as Record<string, unknown>),
    },
    ...overrides,
  } as unknown as AgenticCliConnectionRequest;
}

describe('isAgenticCliConnectionRequest', () => {
  it('accepts the agentic-cli connection type with dashboard URLs', () => {
    const req = validAgenticRequest({
      connectionType: {
        name: 'agentic-cli',
        dashboardUrl: 'https://developer.metamask.io',
        dashboardAuthUrl:
          'https://authentication.dev-api.cx.metamask.io/api/v2/mm-qr-login/token',
      },
    });

    expect(isAgenticCliConnectionRequest(req)).toBe(true);
  });

  it('rejects the agentic-cli connection type when dashboard URLs are invalid', () => {
    const req = validAgenticRequest({
      connectionType: {
        name: 'agentic-cli',
        dashboardUrl: 'metamask://dashboard',
      },
    });

    expect(isAgenticCliConnectionRequest(req)).toBe(false);
  });

  it('rejects payloads without connectionType', () => {
    const req = validAgenticRequest();
    delete (req as unknown as Record<string, unknown>).connectionType;

    expect(isAgenticCliConnectionRequest(req)).toBe(false);
  });
});

describe('isAgenticCliLoginOperation', () => {
  it('treats missing operationType as login', () => {
    expect(isAgenticCliLoginOperation(undefined)).toBe(true);
  });

  it('treats login operationType as login', () => {
    expect(isAgenticCliLoginOperation('login')).toBe(true);
  });

  it('rejects non-login operation types', () => {
    expect(isAgenticCliLoginOperation('tx_approve')).toBe(false);
  });
});
