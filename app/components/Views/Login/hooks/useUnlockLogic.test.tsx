import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUnlockLogic } from './useUnlockLogic';
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
jest.mock('../../../../util/authentication');
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({ isEnabled: jest.fn().mockReturnValue(true) }),
}));

let mockPromptSeedlessRelogin: jest.Mock;

jest.mock('../../../hooks/SeedlessHooks', () => ({
  usePromptSeedlessRelogin: () => ({
    isDeletingInProgress: false,
    promptSeedlessRelogin: mockPromptSeedlessRelogin,
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

describe('useUnlockLogic', () => {
  const mockOnLoginSuccess = jest.fn();
  const mockSetBiometryChoice = jest.fn();

  const defaultParams = {
    password: 'validPassword123',
    biometryChoice: false,
    rememberMe: false,
    onLoginSuccess: mockOnLoginSuccess,
    setBiometryChoice: mockSetBiometryChoice,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPromptSeedlessRelogin = jest.fn();
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

  describe('onLogin - Unlock Flow', () => {
    it('authenticates successfully with valid password', async () => {
      const { result } = renderHook(() => useUnlockLogic(defaultParams));

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

    it('does not set oauth2Login flag for unlock flow', async () => {
      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      const authCall = (Authentication.userEntryAuth as jest.Mock).mock
        .calls[0];
      expect(authCall[1].oauth2Login).toBeUndefined();
    });

    it('sets error when password requirements are not met', async () => {
      (passwordRequirementsMet as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

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

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Seedless Errors (Unlock)', () => {
    it('prompts seedless re-login for seedless errors during unlock', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );

      seedlessError.message = 'SeedlessOnboardingController - Generic Error';

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      await waitFor(() => {
        expect(mockPromptSeedlessRelogin).toHaveBeenCalled();
      });
    });

    it('handles incorrect password error without OAuth tracking', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(strings('login.invalid_password'));
    });

    it('handles password recently updated error', async () => {
      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      expect(result.current.error).toBe(
        strings('login.seedless_password_outdated'),
      );
    });
  });

  describe('Biometric Authentication', () => {
    it('attempts biometric authentication when available', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValue(true);

      const paramsWithBiometry = {
        ...defaultParams,
        biometryChoice: true,
      };

      const { result } = renderHook(() => useUnlockLogic(paramsWithBiometry));

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

      const { result } = renderHook(() => useUnlockLogic(paramsWithBiometry));

      await act(async () => {
        await result.current.tryBiometric();
      });

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

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

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

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

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

  describe('Network Error Handling', () => {
    it('shows no internet connection sheet for seedless errors without network', async () => {
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

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

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

      const { result } = renderHook(() => useUnlockLogic(defaultParams));

      await act(async () => {
        await result.current.onLogin();
      });

      await waitFor(() => {
        expect(mockSetBiometryChoice).toHaveBeenCalledWith(false);
      });
    });
  });
});
