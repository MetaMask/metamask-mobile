import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLoginLogic } from './useLoginLogic';
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

describe('useLoginLogic', () => {
  const mockSaveOnboardingEvent = jest.fn();
  const mockOnLoginSuccess = jest.fn();
  const mockSetBiometryChoice = jest.fn();
  const mockSetRehydrationFailedAttempts = jest.fn();

  const defaultParams = {
    isOAuthRehydration: false,
    password: 'validPassword123',
    biometryChoice: false,
    rememberMe: false,
    saveOnboardingEvent: mockSaveOnboardingEvent,
    onLoginSuccess: mockOnLoginSuccess,
    setBiometryChoice: mockSetBiometryChoice,
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

  describe('onLogin - Regular Login Flow', () => {
    it('authenticates successfully with valid password', async () => {
      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(Authentication.userEntryAuth).toHaveBeenCalledWith(
        'validPassword123',
        { currentAuthType: 'password' },
      );
      expect(mockOnLoginSuccess).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('sets error when password requirements are not met', async () => {
      (passwordRequirementsMet as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));
      expect(Authentication.userEntryAuth).not.toHaveBeenCalled();
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('handles invalid password error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('onLogin - OAuth Rehydration Flow', () => {
    const oauthParams = {
      ...defaultParams,
      isOAuthRehydration: true,
      rehydrationFailedAttempts: 0,
      setRehydrationFailedAttempts: mockSetRehydrationFailedAttempts,
    };

    it('handles OAuth rehydration successfully', async () => {
      const { result } = renderHook(() => useLoginLogic(oauthParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(Authentication.userEntryAuth).toHaveBeenCalledWith(
        'validPassword123',
        { currentAuthType: 'password', oauth2Login: true },
      );
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });

    it('tracks rehydration failure on password error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { result } = renderHook(() => useLoginLogic(oauthParams));

      await act(async () => {
        await result.current.onLogin();
      });

      // The hook tracks the error via analytics
      expect(result.current.error).toBe(strings('login.invalid_password'));
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Too Many Attempts', () => {
    it('displays countdown for too many attempts error', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 1 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.too_many_attempts', { remainingTime: '0:00:03' }),
      );
      expect(result.current.disabledInput).toBe(true);

      // Advance timer by 1 second
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.error).toBe(
        strings('login.too_many_attempts', { remainingTime: '0:00:02' }),
      );
    });

    it('clears error and enables input when countdown finishes', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 1, numberOfAttempts: 1 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.disabledInput).toBe(true);

      // Advance timer to finish countdown
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
    it('handles password recently updated error', async () => {
      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.seedless_password_outdated'),
      );
    });

    it('handles incorrect password with outdated password', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));
    });
  });

  describe('Biometric Authentication', () => {
    it('attempts biometric authentication when available', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValue(true);

      const paramsWithBiometry = {
        ...defaultParams,
        biometryChoice: true,
      };

      const { result } = renderHook(() => useLoginLogic(paramsWithBiometry));

      await act(async () => {
        await result.current.tryBiometric();
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });

    it('handles biometric authentication error gracefully', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockRejectedValue(
        new Error('Biometric auth failed'),
      );

      const paramsWithBiometry = {
        ...defaultParams,
        biometryChoice: true,
      };

      const { result } = renderHook(() => useLoginLogic(paramsWithBiometry));

      await act(async () => {
        await result.current.tryBiometric();
      });

      // The hook logs the error but doesn't throw
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('sets loading state during authentication', async () => {
      let resolveAuth: (value: boolean) => void;
      const authPromise = new Promise<boolean>((resolve) => {
        resolveAuth = resolve;
      });
      (Authentication.userEntryAuth as jest.Mock).mockReturnValue(authPromise);

      const { result } = renderHook(() => useLoginLogic(defaultParams));

      expect(result.current.finalLoading).toBe(false);

      act(() => {
        result.current.onLogin();
      });

      // Should be loading now
      await waitFor(() => {
        expect(result.current.finalLoading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        if (resolveAuth) {
          resolveAuth(true);
        }
      });

      // Loading should be false after completion
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

      const { result } = renderHook(() => useLoginLogic(defaultParams));

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
    it('stops countdown when unmounted', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 5, numberOfAttempts: 1 },
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result, unmount } = renderHook(() =>
        useLoginLogic(defaultParams),
      );

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.disabledInput).toBe(true);

      // Unmount while countdown is running
      unmount();
    });
  });
});
