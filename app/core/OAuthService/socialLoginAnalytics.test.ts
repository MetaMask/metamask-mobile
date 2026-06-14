import { AccountType } from '../../constants/onboarding';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { AuthConnection } from './OAuthInterface';
import { OAuthError, OAuthErrorType } from './error';
import {
  isPreOAuthSocialLoginFailure,
  trackSocialLoginFailed,
} from './socialLoginAnalytics';

const mockTrackEvent = jest.fn();

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

describe('socialLoginAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPreOAuthSocialLoginFailure', () => {
    it('returns true for invalid provider errors', () => {
      expect(
        isPreOAuthSocialLoginFailure(
          new OAuthError('Invalid provider', OAuthErrorType.InvalidProvider),
        ),
      ).toBe(true);
    });

    it('returns true for unsupported platform errors', () => {
      expect(
        isPreOAuthSocialLoginFailure(
          new OAuthError(
            'Unsupported platform',
            OAuthErrorType.UnsupportedPlatform,
          ),
        ),
      ).toBe(true);
    });

    it('returns false for provider login errors handled inside OAuthService', () => {
      expect(
        isPreOAuthSocialLoginFailure(
          new OAuthError('Login error', OAuthErrorType.LoginError),
        ),
      ).toBe(false);
    });
  });

  describe('trackSocialLoginFailed', () => {
    it('tracks Social Login Failed for onboarding create-wallet flow', () => {
      trackSocialLoginFailed({
        authConnection: AuthConnection.Google,
        isRehydration: false,
        errorCategory: 'provider_login',
        error: new OAuthError(
          'Invalid provider',
          OAuthErrorType.InvalidProvider,
        ),
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.SOCIAL_LOGIN_FAILED.category,
          properties: expect.objectContaining({
            account_type: AccountType.MetamaskGoogle,
            is_rehydration: 'false',
            failure_type: 'error',
            error_category: 'provider_login',
          }),
        }),
      );
    });

    it('tracks user_cancelled failure_type for dismiss errors', () => {
      trackSocialLoginFailed({
        authConnection: AuthConnection.Apple,
        isRehydration: true,
        errorCategory: 'provider_login',
        error: new OAuthError('User dismissed', OAuthErrorType.UserDismissed),
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            account_type: AccountType.ImportedApple,
            is_rehydration: 'true',
            failure_type: 'user_cancelled',
          }),
        }),
      );
    });

    it('includes oauth_error_code when error is an OAuthError', () => {
      trackSocialLoginFailed({
        authConnection: AuthConnection.Google,
        isRehydration: false,
        errorCategory: 'provider_login',
        error: new OAuthError('Login error', OAuthErrorType.LoginError),
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            oauth_error_code: String(OAuthErrorType.LoginError),
          }),
        }),
      );
    });
  });
});
