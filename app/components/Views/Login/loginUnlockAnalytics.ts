import { SeedlessOnboardingControllerError } from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import {
  isAndroidKeychainBiometricLockout,
  isBiometricUnlockCancelledByUser,
} from '../../../core/Authentication/utils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import { containsErrorMessage } from '../../../util/errorHandling';
import { trackDeferredOnboardingEvent } from '../../../util/onboarding/trackDeferredOnboardingEvent';
import {
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  PASSCODE_NOT_SET_ERROR,
  VAULT_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';

export const LOGIN_UNLOCK_METHOD = {
  PASSWORD: 'password',
  BIOMETRIC: 'biometric',
} as const;

export type LoginUnlockMethod =
  (typeof LOGIN_UNLOCK_METHOD)[keyof typeof LOGIN_UNLOCK_METHOD];

export const LOGIN_UNLOCK_ERROR_TYPE = {
  WRONG_PASSWORD: 'wrong_password',
  USER_CANCELLED: 'user_cancelled',
  BIOMETRIC_LOCKOUT: 'biometric_lockout',
  VAULT_ERROR: 'vault_error',
  SEEDLESS: 'seedless',
  PASSCODE_NOT_SET: 'passcode_not_set',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

export type LoginUnlockErrorType =
  (typeof LOGIN_UNLOCK_ERROR_TYPE)[keyof typeof LOGIN_UNLOCK_ERROR_TYPE];

export function getLoginUnlockFailureErrorType(
  loginError: Error,
): LoginUnlockErrorType {
  const isWrongPasswordError =
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

  if (isWrongPasswordError) {
    return LOGIN_UNLOCK_ERROR_TYPE.WRONG_PASSWORD;
  }

  if (isBiometricUnlockCancelledByUser(loginError)) {
    return LOGIN_UNLOCK_ERROR_TYPE.USER_CANCELLED;
  }

  if (isAndroidKeychainBiometricLockout(loginError)) {
    return LOGIN_UNLOCK_ERROR_TYPE.BIOMETRIC_LOCKOUT;
  }

  if (containsErrorMessage(loginError, PASSCODE_NOT_SET_ERROR)) {
    return LOGIN_UNLOCK_ERROR_TYPE.PASSCODE_NOT_SET;
  }

  const isVaultCorruption =
    containsErrorMessage(loginError, VAULT_ERROR) ||
    containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN);

  if (isVaultCorruption) {
    return LOGIN_UNLOCK_ERROR_TYPE.VAULT_ERROR;
  }

  const isSeedlessOnboardingControllerError =
    loginError instanceof SeedlessOnboardingControllerError ||
    containsErrorMessage(loginError, 'SeedlessOnboardingController');

  if (isSeedlessOnboardingControllerError) {
    return LOGIN_UNLOCK_ERROR_TYPE.SEEDLESS;
  }

  return LOGIN_UNLOCK_ERROR_TYPE.UNKNOWN_ERROR;
}

export function trackLoginUnlockAttempted({
  loginMethod,
  saveOnboardingEvent,
}: {
  loginMethod: LoginUnlockMethod;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}): void {
  trackDeferredOnboardingEvent(
    MetaMetricsEvents.LOGIN_ATTEMPTED,
    { login_method: loginMethod },
    saveOnboardingEvent,
  );
}

export function trackLoginUnlockCompleted({
  loginMethod,
  saveOnboardingEvent,
}: {
  loginMethod: LoginUnlockMethod;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}): void {
  trackDeferredOnboardingEvent(
    MetaMetricsEvents.LOGIN_COMPLETED,
    { login_method: loginMethod },
    saveOnboardingEvent,
  );
}

export function trackLoginUnlockFailed({
  loginMethod,
  errorType,
  saveOnboardingEvent,
}: {
  loginMethod: LoginUnlockMethod;
  errorType: LoginUnlockErrorType;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}): void {
  trackDeferredOnboardingEvent(
    MetaMetricsEvents.LOGIN_FAILED,
    {
      login_method: loginMethod,
      error_type: errorType,
    },
    saveOnboardingEvent,
  );
}
