import type { AnalyticsUnfilteredProperties } from './analytics.types';
import { OAuthError, OAuthErrorType } from '../../core/OAuthService/error';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../core/Engine/controllers/seedless-onboarding-controller/error';

/**
 * Non-sensitive analytics dimensions for {@link MetaMetricsEvents.SOCIAL_LOGIN_FAILED}.
 */
export function getSocialLoginFailureAnalyticsProperties(
  error: unknown,
): AnalyticsUnfilteredProperties {
  if (error instanceof OAuthError) {
    return {
      failure_error_kind: 'oauth',
      oauth_error_type: OAuthErrorType[error.code] ?? String(error.code),
    };
  }

  if (error instanceof SeedlessOnboardingControllerError) {
    return {
      failure_error_kind: 'seedless',
      seedless_error_type:
        SeedlessOnboardingControllerErrorType[error.code] ?? String(error.code),
    };
  }

  if (error instanceof Error) {
    return {
      failure_error_kind: 'generic',
      generic_error_name: error.name,
    };
  }

  return {
    failure_error_kind: 'generic',
    generic_error_name: 'non_error_throwable',
  };
}

/**
 * Enum member name for seedless controller errors (Lexicon-friendly).
 * Uses TypeScript's built-in numeric enum reverse mapping.
 */
export function getSeedlessOnboardingControllerErrorTypeName(
  code: SeedlessOnboardingControllerErrorType,
): string {
  return SeedlessOnboardingControllerErrorType[code] ?? String(code);
}

/**
 * High-level `error_type` for {@link MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED}
 * when the failure is a {@link SeedlessOnboardingControllerError}.
 */
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

/** `seedless_error_type` when the failure is a seedless recovery error. */
export const SEEDLESS_RECOVERY_ERROR_TYPE_INCORRECT_PASSWORD =
  'recovery_incorrect_password';

export const SEEDLESS_RECOVERY_ERROR_TYPE_TOO_MANY_ATTEMPTS =
  'recovery_too_many_attempts';

/** `error_origin` values for {@link MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED}. */
export enum ErrorOrigin {
  SeedlessRecovery = 'seedless_recovery',
  SeedlessController = 'seedless_controller',
  SeedlessUnclassified = 'seedless_unclassified',
  VaultDecrypt = 'vault_decrypt',
  DevicePasscode = 'device_passcode',
  UnlockWallet = 'unlock_wallet',
}
