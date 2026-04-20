import { OAuthError, OAuthErrorType } from '../../core/OAuthService/error';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../core/Engine/controllers/seedless-onboarding-controller/error';

export interface SocialLoginFailureAnalyticsProperties {
  failure_error_kind: 'oauth' | 'seedless' | 'generic';
  failure_error_value: string;
}

export function getSocialLoginFailureAnalyticsProperties(
  error: unknown,
): SocialLoginFailureAnalyticsProperties {
  if (error instanceof OAuthError) {
    return {
      failure_error_kind: 'oauth',
      failure_error_value: OAuthErrorType[error.code] ?? String(error.code),
    };
  }

  if (error instanceof SeedlessOnboardingControllerError) {
    return {
      failure_error_kind: 'seedless',
      failure_error_value:
        SeedlessOnboardingControllerErrorType[error.code] ?? String(error.code),
    };
  }

  if (error instanceof Error) {
    return {
      failure_error_kind: 'generic',
      failure_error_value: error.name,
    };
  }

  return {
    failure_error_kind: 'generic',
    failure_error_value: 'non_error_throwable',
  };
}

export function getRehydrationErrorTypeForSeedlessControllerCode(
  code: SeedlessOnboardingControllerErrorType,
): string {
  switch (code) {
    case SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated:
      return 'password_recently_updated';
    case SeedlessOnboardingControllerErrorType.AuthenticationError:
      return 'seedless_authentication_error';
    case SeedlessOnboardingControllerErrorType.ChangePasswordError:
      return 'seedless_change_password_error';
    case SeedlessOnboardingControllerErrorType.UnknownError:
      return 'seedless_unknown_error';
    default:
      return `seedless_error_${String(code)}`;
  }
}

export const SEEDLESS_RECOVERY_ERROR_TYPE_AUTH_FAILURE =
  'recovery_auth_failure';

export enum ErrorOrigin {
  SeedlessRecovery = 'seedless_recovery',
  SeedlessController = 'seedless_controller',
  SeedlessUnclassified = 'seedless_unclassified',
  VaultDecrypt = 'vault_decrypt',
  DevicePasscode = 'device_passcode',
  UnlockWallet = 'unlock_wallet',
}
