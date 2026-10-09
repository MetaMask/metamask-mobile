import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  PASSCODE_NOT_SET_ERROR,
  VAULT_ERROR,
  WRONG_PASSWORD_ERROR,
} from './constants';
import {
  APP_UNLOCK_FAILURE_REASON,
  getLoginUnlockFailureErrorType,
  trackAppUnlocked,
  trackAppUnlockedFailed,
  UNLOCK_TYPE,
} from './loginUnlockAnalytics';

const mockTrackEvent = jest.fn();
const mockIsEnabled = jest.fn(() => true);

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: () => mockIsEnabled(),
  },
}));

jest.mock('../../../core/Authentication/utils', () => ({
  isBiometricUnlockCancelledByUser: (error: Error) =>
    error.message === 'biometric-cancelled',
  isAndroidKeychainBiometricLockout: (error: Error) =>
    error.message === 'biometric-lockout',
}));

describe('getLoginUnlockFailureErrorType', () => {
  it('returns incorrect_password for decrypt failures', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error(WRONG_PASSWORD_ERROR),
    );

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.INCORRECT_PASSWORD);
  });

  it('returns user_cancelled for biometric cancellation', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error('biometric-cancelled'),
    );

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.USER_CANCELLED);
  });

  it('returns biometric_lockout for Android lockout errors', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error('biometric-lockout'),
    );

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.BIOMETRIC_LOCKOUT);
  });

  it('returns passcode_not_set for missing device passcode', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error(PASSCODE_NOT_SET_ERROR),
    );

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.PASSCODE_NOT_SET);
  });

  it('returns vault_error for vault corruption', () => {
    const errorType = getLoginUnlockFailureErrorType(new Error(VAULT_ERROR));

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.VAULT_ERROR);
  });

  it('returns seedless for SeedlessOnboardingControllerError', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.AuthenticationError,
      ),
    );

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.SEEDLESS);
  });

  it('returns unknown_error for unclassified failures', () => {
    const errorType = getLoginUnlockFailureErrorType(new Error('network down'));

    expect(errorType).toBe(APP_UNLOCK_FAILURE_REASON.UNKNOWN_ERROR);
  });
});

describe('login unlock tracking helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('tracks App Unlocked with unlock_type', () => {
    trackAppUnlocked({
      unlockType: UNLOCK_TYPE.BIOMETRIC,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.APP_UNLOCKED.category,
        properties: expect.objectContaining({ unlock_type: 'biometric' }),
      }),
    );
  });

  it('tracks App Unlocked Failed with unlock_type and reason', () => {
    trackAppUnlockedFailed({
      unlockType: UNLOCK_TYPE.PASSWORD,
      reason: APP_UNLOCK_FAILURE_REASON.INCORRECT_PASSWORD,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.APP_UNLOCKED_FAILED.category,
        properties: expect.objectContaining({
          unlock_type: 'password',
          reason: 'incorrect_password',
        }),
      }),
    );
  });
});
