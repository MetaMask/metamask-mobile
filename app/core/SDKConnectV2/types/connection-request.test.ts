import { isConnectionRequest, ConnectionRequest } from './connection-request';

/**
 * A compressed secp256k1 public key is exactly 33 bytes.
 * This helper builds a base64 string from an arbitrary 33-byte buffer.
 */
function make33ByteB64(): string {
  const buf = Buffer.alloc(33, 0x02); // 0x02 prefix is a valid compressed key prefix
  return buf.toString('base64');
}

function validRequest(
  overrides: Record<string, unknown> = {},
): ConnectionRequest {
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
    ...overrides,
  } as unknown as ConnectionRequest;
}

describe('isConnectionRequest', () => {
  // ──────────────────────────────────────────
  // top-level shape
  // ──────────────────────────────────────────
  it('returns true for a fully valid request', () => {
    expect(isConnectionRequest(validRequest())).toBe(true);
  });

  it.each([null, undefined, 42, 'string', true, []])(
    'returns false for non-object input: %p',
    (input) => {
      expect(isConnectionRequest(input)).toBe(false);
    },
  );

  it('returns false when sessionRequest is missing', () => {
    const req = validRequest();
    delete (req as Record<string, unknown>).sessionRequest;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when sessionRequest is not an object', () => {
    expect(
      isConnectionRequest({ ...validRequest(), sessionRequest: 'bad' }),
    ).toBe(false);
  });

  // ──────────────────────────────────────────
  // sessionRequest.id
  // ──────────────────────────────────────────
  it('returns false when id is missing', () => {
    const req = validRequest();
    delete (req.sessionRequest as Record<string, unknown>).id;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when id is not a UUID', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).id = 'not-a-uuid';
    expect(isConnectionRequest(req)).toBe(false);
  });

  // ──────────────────────────────────────────
  // sessionRequest.publicKeyB64
  // ──────────────────────────────────────────
  it('returns false when publicKeyB64 is missing', () => {
    const req = validRequest();
    delete (req.sessionRequest as Record<string, unknown>).publicKeyB64;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when publicKeyB64 exceeds 200 characters', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).publicKeyB64 = 'A'.repeat(
      201,
    );
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when publicKeyB64 does not decode to 33 bytes', () => {
    const req = validRequest();
    // 16 bytes → not 33
    (req.sessionRequest as Record<string, unknown>).publicKeyB64 = Buffer.alloc(
      16,
      0x02,
    ).toString('base64');
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('accepts a valid 33-byte compressed public key', () => {
    expect(isConnectionRequest(validRequest())).toBe(true);
  });

  // ──────────────────────────────────────────
  // sessionRequest.channel
  // ──────────────────────────────────────────
  it('returns false when channel is missing', () => {
    const req = validRequest();
    delete (req.sessionRequest as Record<string, unknown>).channel;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when channel does not match handshake:<uuid> pattern', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).channel =
      'websocket-channel-id';
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when channel has the wrong prefix', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).channel =
      'badprefix:aabbccdd-1122-3344-5566-778899aabbcc';
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('accepts a valid handshake channel', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).channel =
      'handshake:aabbccdd-1122-3344-5566-778899aabbcc';
    expect(isConnectionRequest(req)).toBe(true);
  });

  // ──────────────────────────────────────────
  // sessionRequest.mode
  // ──────────────────────────────────────────
  it('returns false when mode is missing', () => {
    const req = validRequest();
    delete (req.sessionRequest as Record<string, unknown>).mode;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it.each(['invalid', 'TRUSTED', 'Untrusted', ''])(
    'returns false for invalid mode value: %p',
    (mode) => {
      const req = validRequest();
      (req.sessionRequest as Record<string, unknown>).mode = mode;
      expect(isConnectionRequest(req)).toBe(false);
    },
  );

  it.each(['trusted', 'untrusted'])('accepts valid mode: %p', (mode) => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).mode = mode;
    expect(isConnectionRequest(req)).toBe(true);
  });

  // ──────────────────────────────────────────
  // sessionRequest.expiresAt
  // ──────────────────────────────────────────
  it('returns false when expiresAt is not a number', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).expiresAt = '12345';
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when expiresAt is NaN', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).expiresAt = NaN;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when expiresAt is in the past', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).expiresAt =
      Date.now() - 1000;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('accepts an expiresAt in the future', () => {
    const req = validRequest();
    (req.sessionRequest as Record<string, unknown>).expiresAt =
      Date.now() + 60_000;
    expect(isConnectionRequest(req)).toBe(true);
  });

  // ──────────────────────────────────────────
  // metadata (top-level)
  // ──────────────────────────────────────────
  it('returns false when metadata is missing', () => {
    const req = validRequest();
    delete (req as Record<string, unknown>).metadata;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when metadata is not an object', () => {
    expect(isConnectionRequest({ ...validRequest(), metadata: 'bad' })).toBe(
      false,
    );
  });

  // ──────────────────────────────────────────
  // metadata.dapp
  // ──────────────────────────────────────────
  it('returns false when metadata.dapp is missing', () => {
    const req = validRequest();
    delete (req.metadata as Record<string, unknown>).dapp;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.name is missing', () => {
    const req = validRequest();
    delete (req.metadata.dapp as Record<string, unknown>).name;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.name exceeds 256 characters', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).name = 'x'.repeat(257);
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.url is missing', () => {
    const req = validRequest();
    delete (req.metadata.dapp as Record<string, unknown>).url;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.url exceeds 2048 characters', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).url =
      `https://example.com/${'x'.repeat(2048)}`;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.url is not a parseable URL', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).url = 'not a url';
    expect(isConnectionRequest(req)).toBe(false);
  });

  // ──────────────────────────────────────────
  // metadata.dapp.icon (optional)
  // ──────────────────────────────────────────
  it('accepts a request without dapp.icon', () => {
    const req = validRequest();
    delete (req.metadata.dapp as Record<string, unknown>).icon;
    expect(isConnectionRequest(req)).toBe(true);
  });

  it('accepts a valid dapp.icon URL', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).icon =
      'https://example.com/icon.png';
    expect(isConnectionRequest(req)).toBe(true);
  });

  it('returns false when dapp.icon is not a string', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).icon = 42;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.icon exceeds 2048 characters', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).icon =
      `https://example.com/${'x'.repeat(2048)}`;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when dapp.icon is not a parseable URL', () => {
    const req = validRequest();
    (req.metadata.dapp as Record<string, unknown>).icon = 'bad icon url';
    expect(isConnectionRequest(req)).toBe(false);
  });

  // ──────────────────────────────────────────
  // metadata.sdk
  // ──────────────────────────────────────────
  it('returns false when metadata.sdk is missing', () => {
    const req = validRequest();
    delete (req.metadata as Record<string, unknown>).sdk;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when sdk.version is missing', () => {
    const req = validRequest();
    delete (req.metadata.sdk as Record<string, unknown>).version;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when sdk.version exceeds 256 characters', () => {
    const req = validRequest();
    (req.metadata.sdk as Record<string, unknown>).version = 'v'.repeat(257);
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when sdk.platform is missing', () => {
    const req = validRequest();
    delete (req.metadata.sdk as Record<string, unknown>).platform;
    expect(isConnectionRequest(req)).toBe(false);
  });

  it('returns false when sdk.platform exceeds 256 characters', () => {
    const req = validRequest();
    (req.metadata.sdk as Record<string, unknown>).platform = 'p'.repeat(257);
    expect(isConnectionRequest(req)).toBe(false);
  });
});
