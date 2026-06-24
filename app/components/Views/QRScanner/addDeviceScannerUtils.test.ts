import { classifyAddDeviceScanContent } from './addDeviceScannerUtils';

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

describe('classifyAddDeviceScanContent', () => {
  it('returns invalid for non-QR-sync content', () => {
    expect(classifyAddDeviceScanContent('hello')).toBe('invalid');
  });

  it('returns valid for a base64 session request MWP deeplink', () => {
    const deeplink = buildAddDeviceQrDeeplink(validSessionRequest());

    expect(classifyAddDeviceScanContent(deeplink)).toBe('valid');
  });

  it('returns valid for wrapped sessionRequest payloads', () => {
    const deeplink = buildAddDeviceQrDeeplink({
      sessionRequest: validSessionRequest(),
    });

    expect(classifyAddDeviceScanContent(deeplink)).toBe('valid');
  });

  it('returns valid for base64 JSON payloads used by manual entry', () => {
    const rawQrData = Buffer.from(
      JSON.stringify({ sessionRequest: validSessionRequest() }),
    ).toString('base64');

    expect(classifyAddDeviceScanContent(rawQrData)).toBe('valid');
  });

  it('returns expired when sessionRequest expiresAt is in the past', () => {
    const deeplink = buildAddDeviceQrDeeplink({
      ...validSessionRequest(),
      expiresAt: Date.now() - 1_000,
    });

    expect(classifyAddDeviceScanContent(deeplink)).toBe('expired');
  });

  it('returns invalid for MWP deeplinks with non-base64 p values', () => {
    expect(
      classifyAddDeviceScanContent('metamask://connect/mwp?p=not-base64-json'),
    ).toBe('invalid');
  });

  it('returns invalid when MWP payload parsing throws', () => {
    expect(classifyAddDeviceScanContent('metamask://connect/mwp')).toBe(
      'invalid',
    );
  });
});
