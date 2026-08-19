import {
  decodeAddDeviceQrPayloadFromMwpDeeplink,
  extractAddDeviceQrSessionExpiresAt,
  tryParseAddDeviceQrMwpDeeplink,
} from './parseAddDeviceQrMwpDeeplink';

const validSessionRequest = () => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  publicKeyB64: Buffer.alloc(33, 1).toString('base64'),
  channel: 'handshake:550e8400-e29b-41d4-a716-446655440001',
  mode: 'untrusted',
  expiresAt: Date.now() + 60_000,
});

const buildAddDeviceQrDeeplink = (payload: unknown) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64',
  );
  return `metamask://connect/mwp?p=${encodeURIComponent(encodedPayload)}`;
};

describe('parseAddDeviceQrMwpDeeplink', () => {
  it('parses a valid base64 session request from an MWP deeplink', () => {
    const sessionRequest = validSessionRequest();
    const deeplink = buildAddDeviceQrDeeplink(sessionRequest);

    expect(tryParseAddDeviceQrMwpDeeplink(deeplink)).toEqual(sessionRequest);
    expect(decodeAddDeviceQrPayloadFromMwpDeeplink(deeplink)).toEqual(
      sessionRequest,
    );
  });

  it('parses a wrapped session request payload', () => {
    const sessionRequest = validSessionRequest();
    const deeplink = buildAddDeviceQrDeeplink({ sessionRequest });

    expect(tryParseAddDeviceQrMwpDeeplink(deeplink)).toEqual(sessionRequest);
  });

  it('returns null for expired session requests', () => {
    const deeplink = buildAddDeviceQrDeeplink({
      ...validSessionRequest(),
      expiresAt: Date.now() - 1_000,
    });

    expect(tryParseAddDeviceQrMwpDeeplink(deeplink)).toBeNull();
    expect(
      extractAddDeviceQrSessionExpiresAt(
        decodeAddDeviceQrPayloadFromMwpDeeplink(deeplink),
      ),
    ).toBeLessThanOrEqual(Date.now());
  });

  it('returns null for non-string input', () => {
    expect(tryParseAddDeviceQrMwpDeeplink(null)).toBeNull();
  });

  it('returns null when p is missing', () => {
    expect(tryParseAddDeviceQrMwpDeeplink('metamask://connect/mwp')).toBeNull();
  });

  it('rejects trusted mode session requests', () => {
    const deeplink = buildAddDeviceQrDeeplink({
      ...validSessionRequest(),
      mode: 'trusted',
    });

    expect(tryParseAddDeviceQrMwpDeeplink(deeplink)).toBeNull();
  });
});
