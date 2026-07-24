import SDKConnectV2 from '../../../core/SDKConnectV2';
import { classifyAddDeviceScanContent } from './addDeviceScannerUtils';

jest.mock('../../../core/SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isMwpDeeplink: jest.fn(),
  },
}));

const mockIsMwpDeeplink = jest.mocked(SDKConnectV2.isMwpDeeplink);

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMwpDeeplink.mockImplementation(
      (url: unknown): url is string =>
        typeof url === 'string' && url.startsWith('metamask://connect/mwp'),
    );
  });

  it('returns invalid for non-MWP content', () => {
    expect(classifyAddDeviceScanContent('hello')).toBe('invalid');
  });

  it('returns valid for a base64 session request MWP deeplink', () => {
    const deeplink = buildAddDeviceQrDeeplink(validSessionRequest());

    expect(classifyAddDeviceScanContent(deeplink)).toBe('valid');
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

  it('returns invalid for trusted-mode session requests', () => {
    const deeplink = buildAddDeviceQrDeeplink({
      ...validSessionRequest(),
      mode: 'trusted',
    });

    expect(classifyAddDeviceScanContent(deeplink)).toBe('invalid');
  });
});
