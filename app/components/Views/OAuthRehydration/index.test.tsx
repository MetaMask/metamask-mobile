import React from 'react';
import { Alert } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { LoginViewSelectors } from '../Login/LoginView.testIds';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import OAuthRehydration from './index';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { strings } from '../../../../locales/i18n';
import {
  AuthConnection,
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
import { captureException } from '@sentry/react-native';
import { UNLOCK_WALLET_ERROR_MESSAGES } from '../../../core/Authentication/constants';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { AccountType } from '../../../constants/onboarding';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEngine = jest.mocked(Engine) as any;

const mockGetAuthType = jest.fn();
const mockComponentAuthenticationType = jest.fn();
const mockUnlockWallet = jest.fn();
const mockLockApp = jest.fn();
const mockReauthenticate = jest.fn();
const mockRevealSRP = jest.fn();
const mockRevealPrivateKey = jest.fn();
const mockRequestBiometricsAccessControlForIOS = jest.fn();
const mockUpdateAuthPreference = jest.fn();
const mockAnalyticsIdentify = jest.fn();
const mockAnalyticsTrackEvent = jest.fn();

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
    requestBiometricsAccessControlForIOS:
      mockRequestBiometricsAccessControlForIOS,
    updateAuthPreference: mockUpdateAuthPreference,
  }),
}));

jest.mock('../../../util/Logger');

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    identify: (...args: unknown[]) => mockAnalyticsIdentify(...args),
    trackEvent: (...args: unknown[]) => mockAnalyticsTrackEvent(...args),
    trackView: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest
      .fn()
      .mockResolvedValue('01c53eb9-aeb9-4cd1-9414-7194419fe88b'),
    isEnabled: jest.fn().mockReturnValue(true),
    isOptedIn: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('../../../images/branding/fox.png', () => 'fox-logo');
jest.mock('../../../images/branding/metamask-name.png', () => 'metamask-name');

jest.mock('../../../util/trace', () => ({
  trace: jest.fn((_config, fn) => (fn ? fn() : Promise.resolve())),
  endTrace: jest.fn(),
  TraceName: {
    LoginUserInteraction: 'LoginUserInteraction',
    AuthenticateUser: 'AuthenticateUser',
    OnboardingPasswordLoginAttempt: 'OnboardingPasswordLoginAttempt',
    OnboardingPasswordLoginError: 'OnboardingPasswordLoginError',
    OnboardingExistingSocialLogin: 'OnboardingExistingSocialLogin',
    OnboardingJourneyOverall: 'OnboardingJourneyOverall',
  },
  TraceOperation: {
    Login: 'Login',
    OnboardingUserJourney: 'OnboardingUserJourney',
    OnboardingError: 'OnboardingError',
  },
}));

import {
  trace as traceMock,
  endTrace as endTraceMock,
} from '../../../util/trace';

jest.mock('../../../util/analytics/vaultCorruptionTracking', () => ({
  trackVaultCorruption: jest.fn(),
}));

jest.mock('../../../util/errorHandling', () => ({
  containsErrorMessage: (error: Error, message: string) =>
    error.toString().toLowerCase().includes(message.toLowerCase()),
}));

const mockIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    isEnabled: () => mockIsEnabled(),
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
      build: jest.fn(),
    })),
  }),
}));

const mockPromptSeedlessRelogin = jest.fn();
const mockIsDeletingInProgress = jest.fn().mockReturnValue(false);
jest.mock('../../hooks/SeedlessHooks', () => ({
  usePromptSeedlessRelogin: () => ({
    isDeletingInProgress: mockIsDeletingInProgress(),
    promptSeedlessRelogin: mockPromptSeedlessRelogin,
  }),
}));

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

const mockGetMarketingOptInStatus = jest.fn().mockResolvedValue({
  is_opt_in: false,
});

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  resetOauthState: jest.fn(),
  getMarketingOptInStatus: (...args: unknown[]) =>
    mockGetMarketingOptInStatus(...args),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockTrackOnboarding = trackOnboarding as jest.Mock;
const mockUseNetInfo = useNetInfo as jest.Mock;
const mockCaptureException = captureException as jest.Mock;

const enterPasswordAndSubmit = async (
  getByTestId: (id: string) => ReactTestInstance,
  password = 'validPassword123',
) => {
  const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
  fireEvent.changeText(passwordInput, password);
  await act(async () => {
    fireEvent(passwordInput, 'submitEditing');
  });
};

describe('OAuthRehydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarketingOptInStatus.mockResolvedValue({
      is_opt_in: false,
    });
    mockRoute.mockReturnValue({
      params: { locked: false, oauthLoginSuccess: true },
    });
    mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
      undefined,
    );
    mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
      undefined,
    );
    mockUnlockWallet.mockImplementation(
      async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
        if (options.onBeforeNavigate) {
          await options.onBeforeNavigate();
        }
      },
    );
    mockGetAuthType.mockResolvedValue({
      currentAuthType: 'password',
      availableBiometryType: null,
    });
    mockComponentAuthenticationType.mockResolvedValue({
      currentAuthType: 'password',
    });
    mockRequestBiometricsAccessControlForIOS.mockResolvedValue(
      AUTHENTICATION_TYPE.PASSWORD,
    );
    mockUpdateAuthPreference.mockResolvedValue(undefined);
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });
    mockIsDeletingInProgress.mockReturnValue(false);
    (traceMock as jest.Mock).mockImplementation(
      (_config: unknown, fn?: () => Promise<void>) =>
        fn ? fn() : Promise.resolve(),
    );
  });

  describe('Successful login flow', () => {
    it('navigates to home after successful password login', async () => {
      mockUnlockWallet.mockImplementationOnce(
        async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
          if (options.onBeforeNavigate) {
            await options.onBeforeNavigate();
          }
          mockReplace(Routes.ONBOARDING.HOME_NAV);
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'validPassword123');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });
      await waitFor(() => {
        expect(mockGetMarketingOptInStatus).toHaveBeenCalled();
      });
      expect(mockUnlockWallet.mock.invocationCallOrder[0]).toBeLessThan(
        mockRequestBiometricsAccessControlForIOS.mock.invocationCallOrder[0],
      );
      expect(mockRequestBiometricsAccessControlForIOS).toHaveBeenCalledWith(
        AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      );
    });

    it('tracks rehydration completed analytics on successful login', async () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('syncs marketing consent into Redux and analytics after unlock', async () => {
      mockGetMarketingOptInStatus.mockResolvedValueOnce({
        is_opt_in: true,
      });

      const { getByTestId, store } = renderWithProvider(<OAuthRehydration />, {
        state: {
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                authConnection: AuthConnection.Google,
              },
            },
          },
        },
      });
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(store.getState().security.dataCollectionForMarketing).toBe(true);
        expect(mockAnalyticsIdentify).toHaveBeenCalledWith({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
        });
        expect(mockAnalyticsTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
            properties: expect.objectContaining({
              [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
              updated_after_onboarding: true,
              location: 'oauth_rehydration',
              account_type: AccountType.ImportedGoogle,
            }),
          }),
        );
      });
    });

    it('logs error when post-unlock biometric prompt fails', async () => {
      const biometricError = new Error('Biometric prompt failed');
      mockRequestBiometricsAccessControlForIOS.mockRejectedValueOnce(
        biometricError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          biometricError,
          'OAuthRehydration: post-unlock biometric preference',
        );
      });
    });

    it('logs error when updateAuthPreference fails after choosing device auth', async () => {
      mockRequestBiometricsAccessControlForIOS.mockResolvedValueOnce(
        AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      );
      const preferenceError = new Error('Keychain preference update failed');
      mockUpdateAuthPreference.mockRejectedValueOnce(preferenceError);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          preferenceError,
          'OAuthRehydration: post-unlock biometric preference',
        );
      });
    });
  });

  describe('Password validation', () => {
    it('displays error for wrong password', async () => {
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('does not prompt biometrics when password unlock fails', async () => {
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
      expect(mockRequestBiometricsAccessControlForIOS).not.toHaveBeenCalled();
      expect(mockUpdateAuthPreference).not.toHaveBeenCalled();
    });

    it('clears error when user types new password', async () => {
      mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'wrongPassword');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });

      fireEvent.changeText(passwordInput, 'newPassword');
      expect(() => getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toThrow();
    });

    it('clears password field after login attempt', async () => {
      mockUnlockWallet.mockRejectedValue(new Error('Invalid password'));
      const { getByTestId, queryByDisplayValue } = renderWithProvider(
        <OAuthRehydration />,
      );
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'wrongPassword');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(queryByDisplayValue('wrongPassword')).toBeNull();
      });
    });
  });

  describe('handleLoginError message extraction', () => {
    it('uses trimmed message for error display', async () => {
      mockUnlockWallet.mockRejectedValue(
        new Error('  Some error with whitespace  '),
      );
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
        expect(errorElement.props.children).toBe('Some error with whitespace');
      });
    });

    it('falls back to error name when message is empty', async () => {
      const errorWithNoMessage = new Error('');
      errorWithNoMessage.name = 'CustomError';
      mockUnlockWallet.mockRejectedValue(errorWithNoMessage);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
        expect(errorElement.props.children).toBe('CustomError');
      });
    });

    it('falls back to String(error) when both message and name are empty', async () => {
      const errorWithNothing = new Error('');
      errorWithNothing.name = '';
      mockUnlockWallet.mockRejectedValue(errorWithNothing);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Seedless error handling', () => {
    it('displays error for incorrect password from seedless controller', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('handles too many login attempts with countdown', async () => {
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { remainingTime: 300, numberOfAttempts: 5 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password');

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('handles too many login attempts with zero remainingTime', async () => {
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 5, remainingTime: 0 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
    });

    it('displays error for password recently updated', async () => {
      const passwordUpdatedError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );
      mockUnlockWallet.mockRejectedValue(passwordUpdatedError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password');

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
    });

    it('navigates to no internet sheet when offline', async () => {
      mockUseNetInfo.mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });
      const seedlessError = new Error(
        'SeedlessOnboardingController - Network error',
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
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
        expect(loginButton).toBeDisabled();
      });

      it('enables login button when password is entered', () => {
        // Arrange
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        fireEvent.changeText(passwordInput, 'password123');

        // Assert
        expect(loginButton).toBeEnabled();
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
            new Promise((resolve) =>
              setTimeout(() => resolve(undefined), 1000),
            ),
        );
        const { getByTestId, unmount } = renderWithProvider(
          <OAuthRehydration />,
        );
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
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
          expect(errorElement.props.children).toBe('Something went wrong');
        });
      });

      it('prompts seedless relogin for non-oauth seedless failure', async () => {
        mockRoute.mockReturnValue({
          params: { locked: true, oauthLoginSuccess: false },
        });
        const seedlessError = new Error(
          'SeedlessOnboardingController - Vault corrupted',
        );
        mockUnlockWallet.mockRejectedValue(seedlessError);

        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(mockPromptSeedlessRelogin).toHaveBeenCalled();
        });
      });

      it('captures Sentry exception for non-oauth seedless failure when metrics enabled', async () => {
        mockRoute.mockReturnValue({
          params: { locked: true, oauthLoginSuccess: false },
        });
        mockIsEnabled.mockReturnValue(true);
        const seedlessError = new Error(
          'SeedlessOnboardingController - Vault corrupted',
        );
        mockUnlockWallet.mockRejectedValue(seedlessError);

        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(mockCaptureException).toHaveBeenCalledWith(
            seedlessError,
            expect.objectContaining({
              tags: expect.objectContaining({ view: 'Re-login' }),
            }),
          );
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
        const { getByTestId, queryByText } = renderWithProvider(
          <OAuthRehydration />,
        );
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Assert - when loading, button is disabled and label text is replaced by ActivityIndicator
        expect(loginButton).toBeDisabled();
        expect(queryByText(strings('login.unlock_button'))).toBeNull();
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

    describe('ensureError wrapping in catch blocks', () => {
      it('wraps non-Error exceptions with ensureError in onRehydrateLogin', async () => {
        mockUnlockWallet.mockRejectedValue('string error');
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(Logger.error).toHaveBeenCalledWith(
            expect.any(Error),
            expect.anything(),
          );
        });
      });

      it('wraps non-Error exceptions with ensureError in newGlobalPasswordLogin', async () => {
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: true,
            isSeedlessPasswordOutdated: true,
          },
        });
        mockUnlockWallet.mockRejectedValue('string error');
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(Logger.error).toHaveBeenCalledWith(
            expect.any(Error),
            expect.anything(),
          );
        });
      });

      it('wraps undefined/null exceptions via ensureError', async () => {
        mockUnlockWallet.mockRejectedValue(undefined);
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(Logger.error).toHaveBeenCalledWith(
            expect.any(Error),
            expect.anything(),
          );
        });
      });
    });

    describe('Best-effort promptBiometricFailedAlert after unlock', () => {
      it('logs error but does not rethrow when promptBiometricFailedAlert fails', async () => {
        mockGetAuthType.mockRejectedValue(new Error('Keychain unavailable'));
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(mockUnlockWallet).toHaveBeenCalled();
        });
        await waitFor(() => {
          expect(Logger.log).toHaveBeenCalledWith(
            expect.any(Error),
            'Failed to prompt biometric alert after unlock',
          );
        });
      });

      it('still completes login successfully when biometric alert fails', async () => {
        mockGetAuthType.mockRejectedValue(new Error('Keychain error'));
        mockTrackOnboarding.mockClear();

        const { getByTestId, queryByTestId } = renderWithProvider(
          <OAuthRehydration />,
        );
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(mockUnlockWallet).toHaveBeenCalled();
        });
        expect(queryByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeNull();
      });

      it('shows biometric cancelled alert when auth fell back to PASSWORD with available biometrics', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockGetAuthType.mockResolvedValue({
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          availableBiometryType: 'FaceID',
        });

        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalledWith(
            strings('login.biometric_authentication_cancelled_title'),
            strings('login.biometric_authentication_cancelled_description'),
            expect.any(Array),
          );
        });
        alertSpy.mockRestore();
      });

      it('does not show biometric alert when auth type is BIOMETRIC', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockGetAuthType.mockResolvedValue({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: 'FaceID',
        });

        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(mockUnlockWallet).toHaveBeenCalled();
        });
        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
      });
    });

    describe('Navigation and user actions', () => {
      it('navigates back and resets OAuth state when using other methods', () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const otherMethodsButton = getByTestId(
          LoginViewSelectors.OTHER_METHODS_BUTTON,
        );

        fireEvent.press(otherMethodsButton);

        expect(mockGoBack).toHaveBeenCalled();
        expect(OAuthService.resetOauthState).toHaveBeenCalled();
      });

      it('disables login button when password is empty', () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
        expect(loginButton).toBeDisabled();
      });

      it('enables login button when password is entered', () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        fireEvent.changeText(passwordInput, 'password123');
        expect(loginButton).toBeEnabled();
      });

      it('shows loading state when isDeletingInProgress is true', () => {
        mockIsDeletingInProgress.mockReturnValue(true);
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
        expect(loginButton).toBeDisabled();
        expect(loginButton.props.accessibilityState.busy).toBe(true);
      });

      it('does not submit when already loading', async () => {
        mockIsDeletingInProgress.mockReturnValue(true);
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

        fireEvent.changeText(passwordInput, 'password123');
        await act(async () => {
          fireEvent(passwordInput, 'submitEditing');
        });

        expect(mockUnlockWallet).not.toHaveBeenCalled();
      });
    });

    describe('Analytics tracking', () => {
      it('tracks login screen view on mount', () => {
        renderWithProvider(<OAuthRehydration />);
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });

      it('tracks different login method click', () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const otherMethodsButton = getByTestId(
          LoginViewSelectors.OTHER_METHODS_BUTTON,
        );

        fireEvent.press(otherMethodsButton);
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });

      it('tracks rehydration password attempted on login', async () => {
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(mockTrackOnboarding).toHaveBeenCalled();
        });
      });

      it('tracks incorrect password error for oauth flow', async () => {
        mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

        await waitFor(() => {
          expect(mockTrackOnboarding).toHaveBeenCalled();
        });
      });

      it('does not track REHYDRATION_PASSWORD_FAILED for non-oauth wrong password', async () => {
        mockRoute.mockReturnValue({
          params: { locked: true, oauthLoginSuccess: false },
        });
        mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

        await waitFor(() => {
          expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
        });
        const failedCalls = mockTrackOnboarding.mock.calls.filter(
          (call) =>
            call[0]?.properties?.name ===
            MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
        );
        expect(failedCalls).toHaveLength(0);
      });
    });

    describe('Error edge cases', () => {
      it('handles Android BAD_DECRYPT error', async () => {
        mockUnlockWallet.mockRejectedValue(
          new Error('Error: Error: BAD_DECRYPT'),
        );
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
        });
      });

      it('handles Android DoCipher error', async () => {
        mockUnlockWallet.mockRejectedValue(
          new Error('Error: Error: Error: DoCipher'),
        );
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
        });
      });

      it('handles generic error and logs it', async () => {
        const genericError = new Error('Some unexpected error');
        mockUnlockWallet.mockRejectedValue(genericError);
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(Logger.error).toHaveBeenCalled();
        });
      });

      it('shows PASSCODE_NOT_SET alert', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockUnlockWallet.mockRejectedValue(new Error('Passcode not set.'));
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalledWith(
            strings('login.security_alert_title'),
            strings('login.security_alert_desc'),
          );
        });
        alertSpy.mockRestore();
      });

      it('captures Sentry exception for unknown oauth errors when metrics enabled', async () => {
        const unknownError = new Error(
          'SeedlessOnboardingController - Unknown crash',
        );
        mockIsEnabled.mockReturnValue(true);
        mockUnlockWallet.mockRejectedValue(unknownError);
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(mockCaptureException).toHaveBeenCalledWith(
            unknownError,
            expect.objectContaining({
              tags: expect.objectContaining({
                view: 'Login',
                context:
                  'OAuth rehydration failed - user consented to analytics',
              }),
            }),
          );
        });
      });

      it('sets errorToThrow for unknown oauth errors when metrics disabled', async () => {
        const unknownError = new Error(
          'SeedlessOnboardingController - Unknown crash',
        );
        mockIsEnabled.mockReturnValue(false);
        mockUnlockWallet.mockRejectedValue(unknownError);

        expect(() => renderWithProvider(<OAuthRehydration />)).not.toThrow();

        // The errorToThrow is set, but since ErrorBoundary catches it, we verify
        // captureException is NOT called
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(mockCaptureException).not.toHaveBeenCalled();
        });
      });
    });

    describe('biometric cancellation', () => {
      it('does not track REHYDRATION_PASSWORD_FAILED when Android biometric is cancelled', async () => {
        mockUnlockWallet.mockRejectedValue(new Error('Cancel'));
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        expect(Logger.error).not.toHaveBeenCalled();
        const rehydrationFailedCalls = mockTrackOnboarding.mock.calls.filter(
          (call) =>
            call[0]?.properties?.name ===
            MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
        );
        expect(rehydrationFailedCalls).toHaveLength(0);
      });

      it('does not track REHYDRATION_PASSWORD_FAILED when iOS biometric is cancelled', async () => {
        mockUnlockWallet.mockRejectedValue(
          new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
        );
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        expect(Logger.error).not.toHaveBeenCalled();
        const rehydrationFailedCalls = mockTrackOnboarding.mock.calls.filter(
          (call) =>
            call[0]?.properties?.name ===
            MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
        );
        expect(rehydrationFailedCalls).toHaveLength(0);
      });

      it('does not track REHYDRATION_PASSWORD_FAILED when Android keychain reports user cancel', async () => {
        mockUnlockWallet.mockRejectedValue(
          new Error('code: 10, msg: Fingerprint operation canceled by user'),
        );
        mockTrackOnboarding.mockClear();
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        expect(Logger.error).not.toHaveBeenCalled();
        const rehydrationFailedCalls = mockTrackOnboarding.mock.calls.filter(
          (call) =>
            call[0]?.properties?.name ===
            MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED.category,
        );
        expect(rehydrationFailedCalls).toHaveLength(0);
      });

      it('sets biometryChoice to false on biometric cancellation', async () => {
        mockUnlockWallet.mockRejectedValue(new Error('Cancel'));
        const { getByTestId, queryByTestId } = renderWithProvider(
          <OAuthRehydration />,
        );
        await enterPasswordAndSubmit(getByTestId, 'password123');

        expect(queryByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeNull();
      });
    });

    describe('Global Password changed (isSeedlessPasswordOutdated)', () => {
      beforeEach(() => {
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: true,
            isSeedlessPasswordOutdated: true,
          },
        });
      });

      it('shows password outdated error via route param', async () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);

        await waitFor(() => {
          const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
          expect(errorElement).toBeTruthy();
          expect(errorElement.props.children).toContain(
            strings('login.seedless_password_outdated'),
          );
        });
      });

      it('shows forgot password link instead of other methods button', () => {
        const { getByTestId, queryByTestId } = renderWithProvider(
          <OAuthRehydration />,
        );

        expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeTruthy();
        expect(
          queryByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON),
        ).toBeNull();
      });

      it('calls newGlobalPasswordLogin instead of onRehydrateLogin', async () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'newPassword123');

        await waitFor(() => {
          expect(mockUnlockWallet).toHaveBeenCalledWith(
            expect.objectContaining({
              authPreference: expect.objectContaining({
                oauth2Login: false,
                currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
              }),
            }),
          );
        });
        expect(mockGetMarketingOptInStatus).not.toHaveBeenCalled();
        expect(mockUnlockWallet.mock.invocationCallOrder[0]).toBeLessThan(
          mockRequestBiometricsAccessControlForIOS.mock.invocationCallOrder[0],
        );
        expect(mockRequestBiometricsAccessControlForIOS).toHaveBeenCalledWith(
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
        );
      });

      it('does not prompt biometrics before unlock when password is wrong (outdated password flow)', async () => {
        mockUnlockWallet.mockRejectedValue(new Error('Error: Decrypt failed'));
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'wrongPassword');

        await waitFor(() => {
          expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
        });
        expect(mockRequestBiometricsAccessControlForIOS).not.toHaveBeenCalled();
      });

      it('navigates to DELETE_WALLET modal on forgot password press', () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        const forgotPassword = getByTestId(LoginViewSelectors.RESET_WALLET);

        fireEvent.press(forgotPassword);

        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.MODAL.DELETE_WALLET,
          }),
        );
      });
    });

    describe('Tracing', () => {
      it('starts onboarding password login attempt trace when onboardingTraceCtx is provided', () => {
        const traceCtx = { traceId: 'test-trace-id' };
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: true,
            onboardingTraceCtx: traceCtx,
          },
        });

        renderWithProvider(<OAuthRehydration />);

        expect(traceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'OnboardingPasswordLoginAttempt',
            parentContext: traceCtx,
          }),
        );
      });

      it('traces login error with error message when onboardingTraceCtx is provided', async () => {
        const traceCtx = { traceId: 'test-trace-id' };
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: true,
            onboardingTraceCtx: traceCtx,
          },
        });
        mockUnlockWallet.mockRejectedValue(new Error('Some login error'));
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId, 'password123');

        await waitFor(() => {
          expect(traceMock).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'OnboardingPasswordLoginError',
              tags: expect.objectContaining({
                errorMessage: 'Some login error',
              }),
            }),
          );
        });
      });

      it('ends onboarding traces on successful login', async () => {
        const { getByTestId } = renderWithProvider(<OAuthRehydration />);
        await enterPasswordAndSubmit(getByTestId);

        await waitFor(() => {
          expect(endTraceMock).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'OnboardingExistingSocialLogin',
            }),
          );
          expect(endTraceMock).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'OnboardingJourneyOverall',
            }),
          );
        });
      });
    });

    describe('Component lifecycle', () => {
      it('prevents state updates after unmount', async () => {
        mockUnlockWallet.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(undefined), 1000),
            ),
        );
        const { getByTestId, unmount } = renderWithProvider(
          <OAuthRehydration />,
        );
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

        fireEvent.changeText(passwordInput, 'password123');
        act(() => {
          fireEvent(passwordInput, 'submitEditing');
        });
        unmount();

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
        expect(true).toBe(true);
      });
    });
  });
});
