import { OAuthError, OAuthErrorType } from '../../core/OAuthService/error';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../core/Engine/controllers/seedless-onboarding-controller/error';
import {
  getRehydrationErrorTypeForSeedlessControllerCode,
  SEEDLESS_RECOVERY_ERROR_TYPE_AUTH_FAILURE,
  getSeedlessOnboardingControllerErrorTypeName,
  getSocialLoginFailureAnalyticsProperties,
} from './loginFailureAnalytics';

describe('loginFailureAnalytics', () => {
  describe('getSocialLoginFailureAnalyticsProperties', () => {
    it('returns oauth dimensions for OAuthError', () => {
      const err = new OAuthError(
        'test',
        OAuthErrorType.GoogleLoginNoCredential,
      );
      expect(getSocialLoginFailureAnalyticsProperties(err)).toStrictEqual({
        failure_error_kind: 'oauth',
        oauth_error_type: 'GoogleLoginNoCredential',
      });
    });

    it('returns seedless dimensions for SeedlessOnboardingControllerError', () => {
      const err = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.AuthenticationError,
        'x',
      );
      expect(getSocialLoginFailureAnalyticsProperties(err)).toStrictEqual({
        failure_error_kind: 'seedless',
        seedless_error_type: 'AuthenticationError',
      });
    });

    it('returns generic dimensions for other Error', () => {
      const err = new TypeError('fail');
      expect(getSocialLoginFailureAnalyticsProperties(err)).toStrictEqual({
        failure_error_kind: 'generic',
        generic_error_name: 'TypeError',
      });
    });

    it('returns generic dimensions for non-error throwables', () => {
      expect(getSocialLoginFailureAnalyticsProperties('string')).toStrictEqual({
        failure_error_kind: 'generic',
        generic_error_name: 'non_error_throwable',
      });
    });
  });

  describe('getRehydrationErrorTypeForSeedlessControllerCode', () => {
    it('maps PasswordRecentlyUpdated', () => {
      expect(
        getRehydrationErrorTypeForSeedlessControllerCode(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        ),
      ).toBe('password_recently_updated');
    });

    it('maps AuthenticationError', () => {
      expect(
        getRehydrationErrorTypeForSeedlessControllerCode(
          SeedlessOnboardingControllerErrorType.AuthenticationError,
        ),
      ).toBe('seedless_authentication_error');
    });

    it('maps ChangePasswordError', () => {
      expect(
        getRehydrationErrorTypeForSeedlessControllerCode(
          SeedlessOnboardingControllerErrorType.ChangePasswordError,
        ),
      ).toBe('seedless_change_password_error');
    });

    it('maps UnknownError', () => {
      expect(
        getRehydrationErrorTypeForSeedlessControllerCode(
          SeedlessOnboardingControllerErrorType.UnknownError,
        ),
      ).toBe('seedless_unknown_error');
    });
  });

  describe('getSeedlessOnboardingControllerErrorTypeName', () => {
    it('returns enum member name', () => {
      expect(
        getSeedlessOnboardingControllerErrorTypeName(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        ),
      ).toBe('PasswordRecentlyUpdated');
    });
  });

  describe('seedless recovery analytics constants', () => {
    it('uses auth failure wording for incorrect password recovery failures', () => {
      expect(SEEDLESS_RECOVERY_ERROR_TYPE_AUTH_FAILURE).toBe(
        'recovery_auth_failure',
      );
    });
  });
});
