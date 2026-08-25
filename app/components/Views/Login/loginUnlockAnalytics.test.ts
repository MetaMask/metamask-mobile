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
  getLoginUnlockFailureErrorType,
  LOGIN_UNLOCK_ERROR_TYPE,
  LOGIN_UNLOCK_METHOD,
  trackLoginUnlockAttempted,
  trackLoginUnlockCompleted,
  trackLoginUnlockFailed,
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
  it('returns wrong_password for decrypt failures', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error(WRONG_PASSWORD_ERROR),
    );

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.WRONG_PASSWORD);
  });

  it('returns user_cancelled for biometric cancellation', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error('biometric-cancelled'),
    );

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.USER_CANCELLED);
  });

  it('returns biometric_lockout for Android lockout errors', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error('biometric-lockout'),
    );

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.BIOMETRIC_LOCKOUT);
  });

  it('returns passcode_not_set for missing device passcode', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new Error(PASSCODE_NOT_SET_ERROR),
    );

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.PASSCODE_NOT_SET);
  });

  it('returns vault_error for vault corruption', () => {
    const errorType = getLoginUnlockFailureErrorType(new Error(VAULT_ERROR));

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.VAULT_ERROR);
  });

  it('returns seedless for SeedlessOnboardingControllerError', () => {
    const errorType = getLoginUnlockFailureErrorType(
      new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.AuthenticationError,
      ),
    );

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.SEEDLESS);
  });

  it('returns unknown_error for unclassified failures', () => {
    const errorType = getLoginUnlockFailureErrorType(new Error('network down'));

    expect(errorType).toBe(LOGIN_UNLOCK_ERROR_TYPE.UNKNOWN_ERROR);
  });
});

describe('login unlock tracking helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('tracks Login Attempted with login_method', () => {
    trackLoginUnlockAttempted({
      loginMethod: LOGIN_UNLOCK_METHOD.PASSWORD,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.LOGIN_ATTEMPTED.category,
        properties: expect.objectContaining({ login_method: 'password' }),
      }),
    );
  });

  it('tracks Login Completed with login_method', () => {
    trackLoginUnlockCompleted({
      loginMethod: LOGIN_UNLOCK_METHOD.BIOMETRIC,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.LOGIN_COMPLETED.category,
        properties: expect.objectContaining({ login_method: 'biometric' }),
      }),
    );
  });

  it('tracks Login Failed with login_method and error_type', () => {
    trackLoginUnlockFailed({
      loginMethod: LOGIN_UNLOCK_METHOD.PASSWORD,
      errorType: LOGIN_UNLOCK_ERROR_TYPE.WRONG_PASSWORD,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.LOGIN_FAILED.category,
        properties: expect.objectContaining({
          login_method: 'password',
          error_type: 'wrong_password',
        }),
      }),
    );
  });
});
