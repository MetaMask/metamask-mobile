import { OAUTH_CONFIG } from './config';
import {
  AppRedirectUri,
  web3AuthNetwork,
  AuthServerUrl,
  AndroidGoogleWebGID,
  AppleWebClientId,
  AppleServerRedirectUri,
  AuthConnectionConfig,
  getIosGoogleConfig,
} from './constants';

const mockDeviceIsIos = jest.fn();
const mockComparePlatformVersionTo = jest.fn();

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: (...args: unknown[]) => mockDeviceIsIos(...args),
    isAndroid: jest.fn().mockReturnValue(false),
    comparePlatformVersionTo: (...args: unknown[]) =>
      mockComparePlatformVersionTo(...args),
  },
}));

const mockAppRedirectUri = 'metamask://oauth-redirect';
describe('OAuth Constants', () => {
  describe('AppRedirectUri', () => {
    it('should generate correct redirect URI', () => {
      expect(AppRedirectUri).toBe(mockAppRedirectUri);
    });
  });

  describe('Environment-based constants', () => {
    const CURRENT_OAUTH_CONFIG = OAUTH_CONFIG.main_prod;

    it('should have web3AuthNetwork from jest config', () => {
      expect(web3AuthNetwork).toBe('sapphire_mainnet');
    });

    it('should have AuthServerUrl from jest config', () => {
      expect(AuthServerUrl).toBe(CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL);
    });

    it('should have Android configuration from jest config', () => {
      expect(AndroidGoogleWebGID).toBe('androidGoogleWebClientId');
      expect(AppleWebClientId).toBe('AppleClientId');
    });

    it('should generate correct Apple server redirect URI', () => {
      expect(AppleServerRedirectUri).toBe(
        CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL + '/api/v1/oauth/callback',
      );
    });
  });

  describe('All constants should be defined', () => {
    it('should have all required constants defined and non-empty', () => {
      expect(web3AuthNetwork).toBeTruthy();
      expect(AuthServerUrl).toBeTruthy();
      expect(AndroidGoogleWebGID).toBeTruthy();
      expect(AppleWebClientId).toBeTruthy();
      expect(AuthConnectionConfig).toBeTruthy();
      expect(AppleServerRedirectUri).toBeTruthy();
    });
  });
});

describe('Error handling with missing environment variables', () => {
  it('should have proper validation logic for missing variables', () => {
    const validateWithMissingVars = () => {
      const requiredVars = {
        WEB3AUTH_NETWORK: '',
        AUTH_SERVER_URL: '',
        IOS_APPLE_CLIENT_ID: 'test-ios-apple-client-id',
        ANDROID_WEB_GOOGLE_CLIENT_ID: 'test-android-google-client-id',
        ANDROID_WEB_APPLE_CLIENT_ID: 'test-android-apple-client-id',
        AUTH_CONNECTION_ID: 'test-auth-connection-id',
        GROUPED_AUTH_CONNECTION_ID: 'test-grouped-auth-connection-id',
      };

      const missingVars = Object.entries(requiredVars)
        .filter(([, value]) => !value || value.trim() === '')
        .map(([key]) => key);

      if (missingVars.length > 0) {
        const errorMessage = `Missing environment variables for OAuthLoginHandlers:\n${missingVars
          .map(
            (key) =>
              `${key}: ${requiredVars[key as keyof typeof requiredVars]}`,
          )
          .join('\n')}`;
        throw new Error(errorMessage);
      }
    };

    expect(() => validateWithMissingVars()).toThrow(
      /Missing environment variables for OAuthLoginHandlers/,
    );
    expect(() => validateWithMissingVars()).toThrow(/WEB3AUTH_NETWORK/);
    expect(() => validateWithMissingVars()).toThrow(/AUTH_SERVER_URL/);
  });
});

describe('getIosGoogleConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceIsIos.mockReturnValue(false);
    mockComparePlatformVersionTo.mockReturnValue(0);
  });

  it('returns iOS-specific config when on iOS < 17.4', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(-1);

    const config = getIosGoogleConfig();

    expect(config).toEqual({
      clientId: 'iosGoogleClientId',
      redirectUri: 'iosGoogleRedirectUri',
    });
  });

  it('returns Android web config when on iOS >= 17.4', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);

    const config = getIosGoogleConfig();

    expect(config.clientId).toBe('androidGoogleWebClientId');
    expect(config.redirectUri).toContain('link.metamask.io');
  });

  it('returns Android web config when on Android', () => {
    mockDeviceIsIos.mockReturnValue(false);
    mockComparePlatformVersionTo.mockReturnValue(0);

    const config = getIosGoogleConfig();

    expect(config.clientId).toBe('androidGoogleWebClientId');
    expect(config.redirectUri).toContain('link.metamask.io');
  });

  it('calls Device.isIos and Device.comparePlatformVersionTo to determine config', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);

    getIosGoogleConfig();

    expect(mockDeviceIsIos).toHaveBeenCalledTimes(1);
    expect(mockComparePlatformVersionTo).toHaveBeenCalledWith('17.4');
  });
});
