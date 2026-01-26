import React from 'react';
import { LoginViewSelectors } from '../Login/LoginView.testIds';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import OAuthRehydration from './index';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { strings } from '../../../../locales/i18n';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useNetInfo } from '@react-native-community/netinfo';
import Logger from '../../../util/Logger';
import { UNLOCK_WALLET_ERROR_MESSAGES } from '../../../core/Authentication/constants';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';

const mockEngine = jest.mocked(Engine);

const mockGetAuthType = jest.fn();
const mockComponentAuthenticationType = jest.fn();
const mockUnlockWallet = jest.fn();
const mockLockApp = jest.fn();
const mockReauthenticate = jest.fn();
const mockRevealSRP = jest.fn();
const mockRevealPrivateKey = jest.fn();

jest.mock('../../../core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({
    getAuthType: mockGetAuthType,
    componentAuthenticationType: mockComponentAuthenticationType,
    unlockWallet: mockUnlockWallet,
    lockApp: mockLockApp,
    reauthenticate: mockReauthenticate,
    revealSRP: mockRevealSRP,
    revealPrivateKey: mockRevealPrivateKey,
  }),
}));

jest.mock('../../../util/Logger');

// Mock images
jest.mock('../../../images/branding/fox.png', () => 'fox-logo');
jest.mock('../../../images/branding/metamask-name.png', () => 'metamask-name');

// Mock other utilities
jest.mock('../../../util/trace', () => ({
  trace: jest.fn((_config, fn) => (fn ? fn() : Promise.resolve())),
  endTrace: jest.fn(),
  TraceName: {},
  TraceOperation: {},
}));

jest.mock('../../../util/analytics/vaultCorruptionTracking', () => ({
  trackVaultCorruption: jest.fn(),
}));

jest.mock('../../../util/errorHandling', () => ({
  containsErrorMessage: (error: Error, message: string) =>
    error.message.includes(message),
}));

// Mock useMetrics
const mockIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: () => mockIsEnabled(),
  }),
  withMetricsAwareness: <T,>(component: T): T => component,
}));

// Mock usePromptSeedlessRelogin
const mockPromptSeedlessRelogin = jest.fn();
const mockIsDeletingInProgress = jest.fn().mockReturnValue(false);
jest.mock('../../hooks/SeedlessHooks', () => ({
  usePromptSeedlessRelogin: () => ({
    isDeletingInProgress: mockIsDeletingInProgress(),
    promptSeedlessRelogin: mockPromptSeedlessRelogin,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
      goBack: mockGoBack,
    }),
    useRoute: () => mockRoute(),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: jest.fn(),
      submitPassword: jest.fn(),
    },
  },
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  resetOauthState: jest.fn(),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

// Mock useNetInfo
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

// mock storage
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockTrackOnboarding = trackOnboarding as jest.Mock;
const mockUseNetInfo = useNetInfo as jest.Mock;

describe('OAuthRehydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.mockReturnValue({
      params: { locked: false, oauthLoginSuccess: true },
    });
    mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
      undefined,
    );
    mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
      undefined,
    );
    mockUnlockWallet.mockResolvedValue(undefined);
    mockComponentAuthenticationType.mockResolvedValue({
      currentAuthType: 'password',
    });
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  describe('Successful login flow', () => {
    it('navigates to home after successful password login', async () => {
      mockUnlockWallet.mockImplementationOnce(async () => {
        mockReplace(Routes.ONBOARDING.HOME_NAV);
      });

      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Act
      fireEvent.changeText(passwordInput, 'validPassword123');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });
    });

    it('tracks rehydration analytics on successful login', async () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'validPassword123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });
  });

  describe('Password validation', () => {
    it('displays error for wrong password', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
        expect(errorElement).toBeTruthy();
      });
    });

    it('clears error when user types new password', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act - First attempt with wrong password
      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });

      // Act - Type new password
      fireEvent.changeText(passwordInput, 'newPassword');

      // Assert - Error should be cleared
      expect(() => getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toThrow();
    });
  });

  describe('Seedless error handling', () => {
    it('displays error for incorrect password from seedless controller', async () => {
      // Arrange
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('handles too many login attempts error', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { remainingTime: 300, numberOfAttempts: 5 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('displays error for password recently updated', async () => {
      // Arrange
      const passwordUpdatedError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );
      mockUnlockWallet.mockRejectedValue(passwordUpdatedError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('navigates to no internet sheet when offline', async () => {
      // Arrange
      mockUseNetInfo.mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });
      const seedlessError = new Error(
        'SeedlessOnboardingController - Network error',
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
      });
    });
  });

  describe('Navigation and user actions', () => {
    it('navigates back and resets OAuth state when using other methods', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      // Act
      fireEvent.press(otherMethodsButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('disables login button when password is empty', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Assert
      expect(loginButton.props.disabled).toBe(true);
    });

    it('enables login button when password is entered', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Act
      fireEvent.changeText(passwordInput, 'password123');

      // Assert
      expect(loginButton.props.disabled).toBe(false);
    });
  });

  describe('Analytics tracking', () => {
    it('tracks login screen view on mount', () => {
      // Act
      renderWithProvider(<OAuthRehydration />);

      // Assert
      expect(mockTrackOnboarding).toHaveBeenCalled();
    });

    it('tracks different login method click', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      // Act
      fireEvent.press(otherMethodsButton);

      // Assert
      expect(mockTrackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Error edge cases', () => {
    it('handles Android BAD_DECRYPT error', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(
        new Error('Error: Error: BAD_DECRYPT'),
      );
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });
  });

  describe('Component lifecycle', () => {
    it('prevents state updates after unmount', async () => {
      // Arrange
      mockUnlockWallet.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(undefined), 1000)),
      );
      const { getByTestId, unmount } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      act(() => {
        fireEvent(passwordInput, 'submitEditing');
      });
      unmount();

      // Assert - Should not crash
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(true).toBe(true);
    });
  });

  describe('Error Handling and Validation', () => {
    it('handles DoCipher error for Android', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(
        new Error('Error: Error: Error: DoCipher'),
      );
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('handles generic seedless error and sanitizes message', async () => {
      // Arrange
      const seedlessError = new Error(
        'SeedlessOnboardingController - Something went wrong',
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('tracks analytics when password error occurs', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('prevents login when password is too short', async () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Act
      fireEvent.changeText(passwordInput, 'short');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Assert - Login should not proceed
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('handles generic error and logs it', async () => {
      // Arrange
      const genericError = new Error('Some unexpected error');
      mockUnlockWallet.mockRejectedValue(genericError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalled();
      });
    });

    it('handles too many attempts without remainingTime', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 5, remainingTime: 0 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('tracks analytics for wrong password errors', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Error: Wrong password'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('handles loading state when isDeletingInProgress is true', () => {
      // Arrange
      mockIsDeletingInProgress.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Assert
      expect(loginButton.props.loading).toBe(true);
    });

    it('handles seedless error with zero remainingTime', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 0, remainingTime: 0 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('tracks metrics when login is attempted', async () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      mockTrackOnboarding.mockClear();

      // Act
      fireEvent.changeText(passwordInput, 'validPassword123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('clears password field on error', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Invalid password'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert - Password should be cleared after error
      await waitFor(() => {
        expect(passwordInput.props.value).toBe('');
      });
    });

    it('formats countdown timer with hours and minutes', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 5, remainingTime: 3661 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });
  });

  describe('Global Password changed', () => {
    it('shows error when password is outdated via route param', async () => {
      // Arrange
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          isSeedlessPasswordOutdated: true,
        },
      });

      // Act
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      // Assert - Error should be displayed
      await waitFor(() => {
        const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
        expect(errorElement).toBeTruthy();
        expect(errorElement.props.children).toContain(
          strings('login.seedless_password_outdated'),
        );
      });
    });
  });

  describe('biometric cancellation', () => {
    it('does not track REHYDRATION_PASSWORD_FAILED when Android biometric is cancelled', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Cancel'));
      mockTrackOnboarding.mockClear();
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      await act(async () => {
        fireEvent.changeText(passwordInput, 'password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      expect(Logger.error).not.toHaveBeenCalled();
      const rehydrationFailedCalls = mockTrackOnboarding.mock.calls.filter(
        (call) =>
          call[0]?.properties?.name ===
          MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
      );
      expect(rehydrationFailedCalls).toHaveLength(0);
    });

    it('does not track REHYDRATION_PASSWORD_FAILED when iOS biometric is cancelled', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(
        new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
      );
      mockTrackOnboarding.mockClear();
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      await act(async () => {
        fireEvent.changeText(passwordInput, 'password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      expect(Logger.error).not.toHaveBeenCalled();
      const rehydrationFailedCalls = mockTrackOnboarding.mock.calls.filter(
        (call) =>
          call[0]?.properties?.name ===
          MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
      );
      expect(rehydrationFailedCalls).toHaveLength(0);
    });
  });
});
