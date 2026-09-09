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

export const UNLOCK_TYPE = {
  PASSWORD: 'password',
  BIOMETRIC: 'biometric',
} as const;

export type UnlockType = (typeof UNLOCK_TYPE)[keyof typeof UNLOCK_TYPE];

export const APP_UNLOCK_FAILURE_REASON = {
  INCORRECT_PASSWORD: 'incorrect_password',
  USER_CANCELLED: 'user_cancelled',
  BIOMETRIC_LOCKOUT: 'biometric_lockout',
  VAULT_ERROR: 'vault_error',
  SEEDLESS: 'seedless',
  PASSCODE_NOT_SET: 'passcode_not_set',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

export type AppUnlockFailureReason =
  (typeof APP_UNLOCK_FAILURE_REASON)[keyof typeof APP_UNLOCK_FAILURE_REASON];

export function getLoginUnlockFailureErrorType(
  loginError: Error,
): AppUnlockFailureReason {
  const isWrongPasswordError =
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
    containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

  if (isWrongPasswordError) {
    return APP_UNLOCK_FAILURE_REASON.INCORRECT_PASSWORD;
  }

  if (isBiometricUnlockCancelledByUser(loginError)) {
    return APP_UNLOCK_FAILURE_REASON.USER_CANCELLED;
  }

  if (isAndroidKeychainBiometricLockout(loginError)) {
    return APP_UNLOCK_FAILURE_REASON.BIOMETRIC_LOCKOUT;
  }

  if (containsErrorMessage(loginError, PASSCODE_NOT_SET_ERROR)) {
    return APP_UNLOCK_FAILURE_REASON.PASSCODE_NOT_SET;
  }

  const isVaultCorruption =
    containsErrorMessage(loginError, VAULT_ERROR) ||
    containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN);

  if (isVaultCorruption) {
    return APP_UNLOCK_FAILURE_REASON.VAULT_ERROR;
  }

  const isSeedlessOnboardingControllerError =
    loginError instanceof SeedlessOnboardingControllerError ||
    containsErrorMessage(loginError, 'SeedlessOnboardingController');

  if (isSeedlessOnboardingControllerError) {
    return APP_UNLOCK_FAILURE_REASON.SEEDLESS;
  }

  return APP_UNLOCK_FAILURE_REASON.UNKNOWN_ERROR;
}

export function trackAppUnlocked({
  unlockType,
  saveOnboardingEvent,
}: {
  unlockType: UnlockType;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}): void {
  trackDeferredOnboardingEvent(
    MetaMetricsEvents.APP_UNLOCKED,
    { unlock_type: unlockType },
    saveOnboardingEvent,
  );
}

export function trackAppUnlockedFailed({
  unlockType,
  reason,
  saveOnboardingEvent,
}: {
  unlockType: UnlockType;
  reason: AppUnlockFailureReason;
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void;
}): void {
  trackDeferredOnboardingEvent(
    MetaMetricsEvents.APP_UNLOCKED_FAILED,
    {
      unlock_type: unlockType,
      reason,
    },
    saveOnboardingEvent,
  );
}
