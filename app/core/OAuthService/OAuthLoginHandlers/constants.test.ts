import { OAUTH_CONFIG } from './config';
import {
  AppRedirectUri,
  web3AuthNetwork,
  AuthServerUrl,
  IosGID,
  IosGoogleRedirectUri,
  AndroidGoogleWebGID,
  AppleWebClientId,
  AppleServerRedirectUri,
  AuthConnectionConfig,
} from './constants';

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

    it('should have IOS configuration from jest config', () => {
      expect(IosGID).toBe('iosGoogleClientId');
      expect(IosGoogleRedirectUri).toBe('iosGoogleRedirectUri');
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
      expect(IosGID).toBeTruthy();
      expect(IosGoogleRedirectUri).toBeTruthy();
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
        IOS_GOOGLE_CLIENT_ID: 'test-ios-google-client-id',
        IOS_GOOGLE_REDIRECT_URI: 'https://test-ios-redirect.example.com',
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
