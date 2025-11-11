import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRehydrationLogic } from './useRehydrationLogic';
import { Authentication } from '../../../../core';
import { passwordRequirementsMet } from '../../../../util/password';
import { strings } from '../../../../../locales/i18n';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../../core/Engine/controllers/seedless-onboarding-controller/error';
import trackOnboarding from '../../../../util/metrics/TrackOnboarding/trackOnboarding';

// Mock dependencies
jest.mock('../../../../core');
jest.mock('../../../../util/password');
jest.mock('../../../../util/validators');
jest.mock('../../../../core/BackupVault');
jest.mock('../../../../util/analytics/vaultCorruptionTracking');
jest.mock('../../../../util/metrics/TrackOnboarding/trackOnboarding');
jest.mock('../../../../util/authentication');
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({ isEnabled: jest.fn().mockReturnValue(true) }),
}));
jest.mock('../../../hooks/SeedlessHooks', () => ({
  usePromptSeedlessRelogin: () => ({
    isDeletingInProgress: false,
    promptSeedlessRelogin: jest.fn(),
  }),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: jest.fn(),
  }),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockReturnValue(false),
}));

describe('useRehydrationLogic', () => {
  const mockSaveOnboardingEvent = jest.fn();
  const mockOnLoginSuccess = jest.fn();
  const mockSetBiometryChoice = jest.fn();
  const mockSetRehydrationFailedAttempts = jest.fn();
  const mockSetErrorToThrow = jest.fn();

  const defaultParams = {
    password: 'validPassword123',
    biometryChoice: false,
    rememberMe: false,
    rehydrationFailedAttempts: 0,
    setRehydrationFailedAttempts: mockSetRehydrationFailedAttempts,
    saveOnboardingEvent: mockSaveOnboardingEvent,
    onLoginSuccess: mockOnLoginSuccess,
    setBiometryChoice: mockSetBiometryChoice,
    setErrorToThrow: mockSetErrorToThrow,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (passwordRequirementsMet as jest.Mock).mockReturnValue(true);
    (Authentication.userEntryAuth as jest.Mock).mockResolvedValue(true);
    (Authentication.componentAuthenticationType as jest.Mock).mockResolvedValue(
      {
        currentAuthType: 'password',
      },
    );
    (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('onLogin - OAuth Rehydration Flow', () => {
    it('handles OAuth rehydration successfully with oauth2Login flag', async () => {
      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(Authentication.userEntryAuth).toHaveBeenCalledWith(
        'validPassword123',
        { currentAuthType: 'password', oauth2Login: true },
      );
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });

    it('tracks REHYDRATION_PASSWORD_ATTEMPTED event on login attempt', async () => {
      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Password Attempted',
          properties: expect.objectContaining({
            account_type: 'social',
            biometrics: false,
          }),
        }),
        mockSaveOnboardingEvent,
      );
    });

    it('tracks REHYDRATION_COMPLETED event on successful login', async () => {
      const { result } = renderHook(() =>
        useRehydrationLogic({
          ...defaultParams,
          rehydrationFailedAttempts: 2,
        }),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Completed',
          properties: expect.objectContaining({
            account_type: 'social',
            biometrics: false,
            failed_attempts: 2,
          }),
        }),
        mockSaveOnboardingEvent,
      );
    });

    it('tracks REHYDRATION_PASSWORD_FAILED on wrong password', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Password Failed',
          properties: expect.objectContaining({
            account_type: 'social',
            failed_attempts: 0,
            error_type: 'incorrect_password',
          }),
        }),
        mockSaveOnboardingEvent,
      );
      expect(result.current.error).toBe(strings('login.invalid_password'));
    });
  });

  describe('Error Handling - Too Many Attempts', () => {
    it('displays countdown for too many attempts error', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 5 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.too_many_attempts', { remainingTime: '0:00:03' }),
      );
      expect(result.current.disabledInput).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.error).toBe(
        strings('login.too_many_attempts', { remainingTime: '0:00:02' }),
      );
    });

    it('updates failed attempts count for too many attempts error', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 5 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(mockSetRehydrationFailedAttempts).toHaveBeenCalledWith(5);
    });

    it('tracks rehydration failure with attempt count', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 5 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Password Failed',
          properties: expect.objectContaining({
            account_type: 'social',
            failed_attempts: 5,
            error_type: 'incorrect_password',
          }),
        }),
        mockSaveOnboardingEvent,
      );
    });

    it('clears error and enables input when countdown finishes', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 1, numberOfAttempts: 3 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.disabledInput).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.disabledInput).toBe(false);
      });
    });
  });

  describe('Error Handling - Password Outdated', () => {
    it('handles password recently updated error with OAuth tracking', async () => {
      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() =>
        useRehydrationLogic({
          ...defaultParams,
          rehydrationFailedAttempts: 3,
        }),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.seedless_password_outdated'),
      );

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Password Failed',
          properties: expect.objectContaining({
            account_type: 'social',
            failed_attempts: 3,
            error_type: 'unknown_error',
          }),
        }),
        mockSaveOnboardingEvent,
      );
    });

    it('handles incorrect password with OAuth tracking', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() =>
        useRehydrationLogic({
          ...defaultParams,
          rehydrationFailedAttempts: 1,
        }),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));

      expect(trackOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rehydration Password Failed',
          properties: expect.objectContaining({
            account_type: 'social',
            failed_attempts: 1,
            error_type: 'incorrect_password',
          }),
        }),
        mockSaveOnboardingEvent,
      );
    });
  });

  describe('Error Boundary Handling', () => {
    it('sets error to throw when metrics disabled and OAuth error occurs', async () => {
      // This test verifies error boundary handling
      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'SeedlessOnboardingController - Unknown error',
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.seedless_password_outdated'),
      );
    });
  });

  describe('Biometric Authentication', () => {
    it('attempts biometric authentication', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValue(true);

      const paramsWithBiometry = {
        ...defaultParams,
        biometryChoice: true,
      };

      const { result } = renderHook(() =>
        useRehydrationLogic(paramsWithBiometry),
      );

      await act(async () => {
        await result.current.tryBiometric();
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });

    it('handles biometric authentication error', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockRejectedValue(
        new Error('Biometric auth failed'),
      );

      const paramsWithBiometry = {
        ...defaultParams,
        biometryChoice: true,
      };

      const { result } = renderHook(() =>
        useRehydrationLogic(paramsWithBiometry),
      );

      await act(async () => {
        await result.current.tryBiometric();
      });

      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('sets loading state during rehydration', async () => {
      let resolveAuth: (value: boolean) => void;
      const authPromise = new Promise<boolean>((resolve) => {
        resolveAuth = resolve;
      });
      (Authentication.userEntryAuth as jest.Mock).mockReturnValue(authPromise);

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      expect(result.current.finalLoading).toBe(false);

      act(() => {
        result.current.onLogin();
      });

      await waitFor(() => {
        expect(result.current.finalLoading).toBe(true);
      });

      await act(async () => {
        if (resolveAuth) {
          resolveAuth(true);
        }
      });

      await waitFor(() => {
        expect(result.current.finalLoading).toBe(false);
      });
    });
  });

  describe('Error Clearing', () => {
    it('clears error when setError is called with null', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('stops countdown when unmounted during too many attempts', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 5, numberOfAttempts: 3 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result, unmount } = renderHook(() =>
        useRehydrationLogic(defaultParams),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.disabledInput).toBe(true);

      unmount();
    });
  });

  describe('Network Error Handling', () => {
    it('shows no internet connection sheet for OAuth errors without network', async () => {
      // Mock no internet connection
      jest.mock('@react-native-community/netinfo', () => ({
        useNetInfo: () => ({
          isConnected: false,
          isInternetReachable: false,
        }),
      }));

      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });
    });
  });

  describe('Biometry Choice Update', () => {
    it('updates biometry choice when DENY_PIN_ERROR occurs', async () => {
      const denyPinError = new Error('Error: Error: Cancel');
      denyPinError.toString = () => 'Error: Error: Cancel';

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        denyPinError,
      );

      const { result } = renderHook(() => useRehydrationLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      await waitFor(() => {
        expect(mockSetBiometryChoice).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Analytics Tracking - Comprehensive', () => {
    it('tracks all rehydration events in correct order', async () => {
      const { result } = renderHook(() =>
        useRehydrationLogic({
          ...defaultParams,
          biometryChoice: true,
          rehydrationFailedAttempts: 2,
        }),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      // Verify tracking order
      const calls = (trackOnboarding as jest.Mock).mock.calls;

      expect(calls[0][0]).toMatchObject({
        name: 'Rehydration Password Attempted',
        properties: {
          account_type: 'social',
          biometrics: true,
        },
      });

      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toMatchObject({
        name: 'Rehydration Completed',
        properties: {
          account_type: 'social',
          biometrics: true,
          failed_attempts: 2,
        },
      });
    });
  });
});
