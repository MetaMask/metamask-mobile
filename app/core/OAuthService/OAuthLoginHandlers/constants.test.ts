import { OAUTH_CONFIG } from './config';
import {
  AppRedirectUri,
  web3AuthNetwork,
  AuthServerUrl,
  GoogleWebGID,
  AppleWebClientId,
  AppleServerRedirectUri,
  AuthConnectionConfig,
  getIosGoogleConfig,
  shouldUseLegacyIosGoogleConfig,
} from './constants';

const mockDeviceIsIos = jest.fn();
const mockComparePlatformVersionTo = jest.fn();
const mockSelectLegacyIosGoogleConfigEnabled = jest.fn();
const mockGetState = jest.fn();

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: (...args: unknown[]) => mockDeviceIsIos(...args),
    isAndroid: jest.fn().mockReturnValue(false),
    comparePlatformVersionTo: (...args: unknown[]) =>
      mockComparePlatformVersionTo(...args),
  },
}));

jest.mock('../../redux', () => ({
  __esModule: true,
  default: {
    get store() {
      return {
        getState: (...args: unknown[]) => mockGetState(...args),
      };
    },
  },
}));

jest.mock(
  '../../../selectors/featureFlagController/legacyIosGoogleConfig',
  () => ({
    DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED: true,
    selectLegacyIosGoogleConfigEnabled: (...args: unknown[]) =>
      mockSelectLegacyIosGoogleConfigEnabled(...args),
  }),
);

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
      expect(GoogleWebGID).toBe('androidGoogleWebClientId');
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
      expect(GoogleWebGID).toBeTruthy();
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
        ANDROID_GOOGLE_SERVER_CLIENT_ID: 'test-android-google-client-id',
        ANDROID_APPLE_CLIENT_ID: 'test-android-apple-client-id',
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
    mockGetState.mockReturnValue({});
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(true);
  });

  it('returns iOS-specific config when the legacy flag is enabled on iOS < 17.4', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(-1);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(true);

    const config = getIosGoogleConfig();

    expect(config).toEqual({
      clientId: 'iosGoogleClientId',
      redirectUri: 'iosGoogleRedirectUri',
    });
  });

  it('returns iOS-specific config when the legacy flag is enabled on iOS 17.4 or later', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(true);

    const config = getIosGoogleConfig();

    expect(config).toEqual({
      clientId: 'iosGoogleClientId',
      redirectUri: 'iosGoogleRedirectUri',
    });
  });

  it('returns Android web config when on Android', () => {
    mockDeviceIsIos.mockReturnValue(false);
    mockComparePlatformVersionTo.mockReturnValue(0);

    const config = getIosGoogleConfig();

    expect(config.clientId).toBe('androidGoogleWebClientId');
    expect(config.redirectUri).toContain('link.metamask.io');
  });

  it('calls Device.isIos and Device.comparePlatformVersionTo when evaluating the non-legacy path', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(false);

    getIosGoogleConfig();

    expect(mockDeviceIsIos).toHaveBeenCalled();
    expect(mockComparePlatformVersionTo).toHaveBeenCalledWith('17.4');
  });

  it('returns Android web config when the legacy iOS flag is disabled on iOS 17.4 or later', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(false);

    const config = getIosGoogleConfig();

    expect(config.clientId).toBe('androidGoogleWebClientId');
    expect(config.redirectUri).toContain('link.metamask.io');
  });

  it('returns iOS-specific config when on iOS below 17.4 even if the legacy flag is disabled', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(-1);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(false);

    const config = getIosGoogleConfig();

    expect(config).toEqual({
      clientId: 'iosGoogleClientId',
      redirectUri: 'iosGoogleRedirectUri',
    });
  });
});

describe('shouldUseLegacyIosGoogleConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceIsIos.mockReturnValue(false);
    mockComparePlatformVersionTo.mockReturnValue(0);
    mockGetState.mockReturnValue({});
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(true);
  });

  it('returns false when the device is not iOS', () => {
    expect(shouldUseLegacyIosGoogleConfig()).toBe(false);
  });

  it('returns the feature flag value on iOS 17.4 or newer', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(0);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(true);

    expect(shouldUseLegacyIosGoogleConfig()).toBe(true);
  });

  it('returns the feature flag value on iOS below 17.4', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(-1);
    mockSelectLegacyIosGoogleConfigEnabled.mockReturnValue(false);

    expect(shouldUseLegacyIosGoogleConfig()).toBe(false);
    expect(mockGetState).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default when Redux is unavailable', () => {
    mockDeviceIsIos.mockReturnValue(true);
    mockComparePlatformVersionTo.mockReturnValue(-1);
    mockGetState.mockImplementation(() => {
      throw new Error('store unavailable');
    });

    expect(shouldUseLegacyIosGoogleConfig()).toBe(true);
  });
});
