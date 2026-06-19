import SDKConnectV2 from '../../../core/SDKConnectV2';
import { tryParseExtensionAccountSyncConnectionRequest } from '../../../core/ExtensionAccountSync/extensionAccountSyncConnectionRequest';
import { classifyAddDeviceScanContent } from './addDeviceScannerUtils';

jest.mock('../../../core/SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isMwpDeeplink: jest.fn(),
  },
}));

jest.mock(
  '../../../core/ExtensionAccountSync/extensionAccountSyncConnectionRequest',
  () => ({
    tryParseExtensionAccountSyncConnectionRequest: jest.fn(),
  }),
);

jest.mock('../../../core/SDKConnectV2/utils/parseMwpConnectDeeplink', () => ({
  parseMwpConnectPayload: jest.fn(),
}));

const mockIsMwpDeeplink = jest.mocked(SDKConnectV2.isMwpDeeplink);
const mockTryParse = jest.mocked(tryParseExtensionAccountSyncConnectionRequest);
const { parseMwpConnectPayload } = jest.requireMock(
  '../../../core/SDKConnectV2/utils/parseMwpConnectDeeplink',
);
const mockParseMwpConnectPayload = jest.mocked(parseMwpConnectPayload);

describe('classifyAddDeviceScanContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns invalid for non-MWP content', () => {
    mockIsMwpDeeplink.mockReturnValue(false);

    expect(classifyAddDeviceScanContent('hello')).toBe('invalid');
  });

  it('returns valid for a parseable extension account sync deeplink', () => {
    mockIsMwpDeeplink.mockReturnValue(true);
    mockTryParse.mockReturnValue({} as never);

    expect(classifyAddDeviceScanContent('metamask://connect/mwp?p=abc')).toBe(
      'valid',
    );
  });

  it('returns expired when sessionRequest expiresAt is in the past', () => {
    mockIsMwpDeeplink.mockReturnValue(true);
    mockTryParse.mockReturnValue(null);
    mockParseMwpConnectPayload.mockReturnValue({
      sessionRequest: { expiresAt: Date.now() - 1_000 },
    });

    expect(classifyAddDeviceScanContent('metamask://connect/mwp?p=abc')).toBe(
      'expired',
    );
  });

  it('returns invalid for MWP payloads that are not extension account sync', () => {
    mockIsMwpDeeplink.mockReturnValue(true);
    mockTryParse.mockReturnValue(null);
    mockParseMwpConnectPayload.mockReturnValue({
      sessionRequest: { expiresAt: Date.now() + 60_000 },
    });

    expect(classifyAddDeviceScanContent('metamask://connect/mwp?p=abc')).toBe(
      'invalid',
    );
  });
});
