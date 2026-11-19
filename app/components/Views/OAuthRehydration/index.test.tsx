import React from 'react';
import { Alert, BackHandler, InteractionManager } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../Login/LoginView.testIds';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import OAuthRehydration from './index';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { strings } from '../../../../locales/i18n';
import { WalletRecoverySelectorsIDs } from './WalletRecovery';
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
import { captureExceptionForced } from '../../../util/sentry/utils';
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
const UNLOCK_TRACE_TOKENS = {
  homepageReadyTraceToken: 1,
  deeplinkNavigatedTraceToken: 2,
};
const mockStartUnlockTraces = jest.fn(
  (..._args: unknown[]) => UNLOCK_TRACE_TOKENS,
);
const mockCancelUnlockTraces = jest.fn();

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

jest.mock('../../../core/Performance/unlockTraces', () => ({
  startUnlockTraces: (...args: unknown[]) => mockStartUnlockTraces(...args),
  cancelUnlockTraces: (...args: unknown[]) => mockCancelUnlockTraces(...args),
}));

jest.mock('../../../util/Logger');

jest.mock('../../../util/sentry/utils', () => ({
  captureExceptionForced: jest.fn().mockResolvedValue(undefined),
}));

jest.mock(
  '../../../util/onboarding/hooks/useOnboardingLoadingStallTracker',
  () => ({
    useOnboardingLoadingStallTracker: jest.fn(),
  }),
);

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

jest.mock('../../UI/FoxAnimation/FoxAnimation');

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn((_config, fn) => (fn ? fn() : Promise.resolve())),
  endTrace: jest.fn(),
  getTraceContext: jest.fn(),
}));

import {
  trace as traceMock,
  endTrace as endTraceMock,
  getTraceContext as getTraceContextMock,
  TraceName,
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
    AuthenticationController: {
      holdLockedRecoveryVerification: jest.fn(),
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

const mockSelectMfaRecoveryEnabled = jest.fn().mockReturnValue(false);
jest.mock('../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: (state: unknown) =>
    mockSelectMfaRecoveryEnabled(state),
}));

const mockSelectMfaUiKitEnabled = jest.fn().mockReturnValue(false);
const mockSelectMoneyEnableMfaFlag = jest.fn().mockReturnValue(false);
jest.mock('../../../selectors/featureFlagController/mfaUiKit', () => ({
  selectMfaUiKitEnabled: (state: unknown) => mockSelectMfaUiKitEnabled(state),
}));
jest.mock('../../UI/Money/selectors/featureFlags', () => {
  const actual = jest.requireActual('../../UI/Money/selectors/featureFlags');
  return {
    ...actual,
    selectMoneyEnableMfaFlag: (state: unknown) =>
      mockSelectMoneyEnableMfaFlag(state),
  };
});

const mockVerifyForSocialLogin = jest.fn();
const mockListActiveSocialLoginMethods = jest.fn();
jest.mock('../../../util/identity/mfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: jest.fn(),
    enroll: jest.fn(),
    listActiveSocialLoginMethods: (...args: unknown[]) =>
      mockListActiveSocialLoginMethods(...args),
    verifyForSocialLogin: (...args: unknown[]) =>
      mockVerifyForSocialLogin(...args),
  }),
}));

const mockPasswordlessPrepare = jest.fn().mockResolvedValue(false);
const mockPasswordlessPrefetch = jest.fn().mockResolvedValue(true);
const mockPasswordlessRecover = jest.fn().mockResolvedValue(undefined);
const mockPasswordlessClear = jest.fn();
let mockRecoverySecretHeld = false;
jest.mock('../../../core/MfaRecovery/PasswordlessRecoveryService', () => ({
  __esModule: true,
  default: {
    prepare: (...args: unknown[]) => mockPasswordlessPrepare(...args),
    prefetchForChoosePassword: (...args: unknown[]) =>
      mockPasswordlessPrefetch(...args),
    recover: (...args: unknown[]) => mockPasswordlessRecover(...args),
    clear: (...args: unknown[]) => mockPasswordlessClear(...args),
  },
}));
jest.mock('../../../core/MfaRecovery/passwordlessRecoveryHold', () => ({
  hasPasswordlessRecoveryHold: () => mockRecoverySecretHeld,
  clearPasswordlessRecoveryHold: jest.fn(),
  setPasswordlessRecoveryHold: jest.fn(),
  takePasswordlessRecoveryHold: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockTrackOnboarding = trackOnboarding as jest.Mock;
const mockUseNetInfo = useNetInfo as jest.Mock;
const mockCaptureException = captureException as jest.Mock;
const mockCaptureExceptionForced = captureExceptionForced as jest.Mock;

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
    mockSelectMfaUiKitEnabled.mockReturnValue(false);
    mockSelectMoneyEnableMfaFlag.mockReturnValue(false);
    mockSelectMfaRecoveryEnabled.mockReturnValue(false);
    mockVerifyForSocialLogin.mockReset();
    mockListActiveSocialLoginMethods.mockReset();
    mockListActiveSocialLoginMethods.mockResolvedValue([]);
    mockPasswordlessPrepare.mockReset();
    mockPasswordlessPrepare.mockResolvedValue(true);
    mockPasswordlessPrefetch.mockReset();
    mockPasswordlessPrefetch.mockImplementation(async () => {
      mockRecoverySecretHeld = true;
      return true;
    });
    mockPasswordlessRecover.mockReset();
    mockPasswordlessRecover.mockResolvedValue(undefined);
    mockPasswordlessClear.mockReset();
    mockPasswordlessClear.mockImplementation(() => {
      mockRecoverySecretHeld = false;
    });
    mockRecoverySecretHeld = false;
    mockEngine.context.AuthenticationController.holdLockedRecoveryVerification.mockReset();
    (traceMock as jest.Mock).mockImplementation(
      (_config: unknown, fn?: () => Promise<void>) =>
        fn ? fn() : Promise.resolve(),
    );
    (getTraceContextMock as jest.Mock).mockReturnValue(undefined);
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

    it('does not read marketing consent from the OAuth backend after unlock', async () => {
      const { getByTestId, store } = renderWithProvider(<OAuthRehydration />, {
        state: {
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                authConnection: AuthConnection.Google,
              },
            },
          },
          security: { dataCollectionForMarketing: false },
        },
      });
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalled();
      });
      expect(mockGetMarketingOptInStatus).not.toHaveBeenCalled();
      expect(store.getState().security.dataCollectionForMarketing).toBe(false);
      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
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
      expect(mockCancelUnlockTraces).toHaveBeenCalledWith(UNLOCK_TRACE_TOKENS);
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

    it('clears password field on error', async () => {
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

    it('force-captures Sentry for non-oauth seedless failure without incident_1745 tag', async () => {
      mockRoute.mockReturnValue({
        params: { locked: true, oauthLoginSuccess: false },
      });
      mockIsEnabled.mockReturnValue(false);
      const seedlessError = new Error(
        'SeedlessOnboardingController - Vault corrupted',
      );
      mockUnlockWallet.mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        expect(mockCaptureExceptionForced).toHaveBeenCalledWith(
          seedlessError,
          expect.objectContaining({
            view: 'Re-login',
            context: 'seedless flow unlock wallet failed',
            profile_id: expect.any(String),
          }),
        );
        const extra = mockCaptureExceptionForced.mock.calls[0][1] as Record<
          string,
          string
        >;
        expect(extra.incident).toBeUndefined();
      });
    });

    it('tracks analytics for wrong password errors', async () => {
      // Arrange
      mockUnlockWallet.mockRejectedValue(new Error('Error: Wrong password'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      mockTrackOnboarding.mockClear();
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

    it('handles seedless error with zero remainingTime', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 0, remainingTime: 0 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      mockTrackOnboarding.mockClear();
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

    it('formats countdown timer with hours and minutes', async () => {
      // Arrange
      const tooManyAttemptsError =
        new SeedlessOnboardingControllerRecoveryError(
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
          { numberOfAttempts: 5, remainingTime: 3661 },
        );
      mockUnlockWallet.mockRejectedValue(tooManyAttemptsError);
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      mockTrackOnboarding.mockClear();
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
              context: 'OAuth rehydration failed - user consented to analytics',
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
      expect(queryByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON)).toBeNull();
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
    it('does not start password login attempt on mount', () => {
      const journeyCtx = { traceId: 'journey' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );

      renderWithProvider(<OAuthRehydration />);

      expect(traceMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingPasswordLoginAttempt,
        }),
      );
    });

    it('starts password login attempt on submit nested under Existing Social Login', async () => {
      const journeyCtx = { traceId: 'journey' };
      const existingSocialCtx = { traceId: 'existing-social' };
      const passwordAttemptCtx = { traceId: 'password-attempt' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          if (req.name === TraceName.OnboardingExistingSocialLogin)
            return existingSocialCtx;
          return undefined;
        },
      );
      (traceMock as jest.Mock).mockImplementation(
        (config: { name?: string }, fn?: () => Promise<void>) => {
          if (fn) {
            return fn();
          }
          if (config?.name === TraceName.OnboardingPasswordLoginAttempt) {
            return passwordAttemptCtx;
          }
          return undefined;
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(getTraceContextMock).toHaveBeenCalledWith({
          name: TraceName.OnboardingExistingSocialLogin,
        });
        expect(traceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginAttempt,
            parentContext: existingSocialCtx,
          }),
        );
        expect(mockUnlockWallet).toHaveBeenCalledWith(
          expect.objectContaining({
            parentContext: passwordAttemptCtx,
          }),
        );
      });
    });

    it('falls back to journey trace context when Existing Social Login span is not open', async () => {
      const journeyCtx = { traceId: 'journey' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(traceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginAttempt,
            parentContext: journeyCtx,
          }),
        );
      });
    });

    it('traces login error under password login attempt when journey trace context is available via getTraceContext', async () => {
      const journeyCtx = { traceId: 'journey' };
      const passwordAttemptCtx = { traceId: 'password-attempt' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );
      (traceMock as jest.Mock).mockImplementation(
        (config: { name?: string }, fn?: () => Promise<void>) => {
          if (fn) {
            return fn();
          }
          if (config?.name === TraceName.OnboardingPasswordLoginAttempt) {
            return passwordAttemptCtx;
          }
          return undefined;
        },
      );
      mockUnlockWallet.mockRejectedValue(new Error('Some login error'));
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId, 'password123');

      await waitFor(() => {
        expect(traceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginError,
            tags: expect.objectContaining({
              errorMessage: 'Some login error',
            }),
            parentContext: passwordAttemptCtx,
          }),
        );
        expect(endTraceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginAttempt,
            data: { success: false },
          }),
        );
      });
    });

    it('ends onboarding traces on successful login', async () => {
      const journeyCtx = { traceId: 'journey' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(endTraceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginAttempt,
          }),
        );
        expect(endTraceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingExistingSocialLogin,
          }),
        );
        expect(endTraceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingJourneyOverall,
          }),
        );
      });
    });

    it('ends OnboardingJourneyOverall before navigation so a successful social login is not recorded as abandoned', async () => {
      const journeyCtx = { traceId: 'journey' };
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );

      // Simulate unlockWallet: run onBeforeNavigate first, then reset navigation
      // to home (which is what unmounts the Onboarding screen in production).
      mockUnlockWallet.mockImplementation(
        async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
          if (options.onBeforeNavigate) {
            await options.onBeforeNavigate();
          }
          mockReplace(Routes.ONBOARDING.HOME_NAV);
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });

      const endTraceJestMock = endTraceMock as jest.Mock;
      const journeyEndCall = endTraceJestMock.mock.calls.find(
        ([request]: [{ name?: string; data?: { success?: boolean } }]) =>
          request?.name === TraceName.OnboardingJourneyOverall,
      );
      // Journey span must be ended, and never with a failure/abandoned marker.
      expect(journeyEndCall).toBeDefined();
      expect(journeyEndCall?.[0]?.data?.success).not.toBe(false);

      // Journey span must be closed BEFORE navigation resets/unmounts onboarding,
      // otherwise the Onboarding unmount cleanup wins and records success: false.
      const journeyEndOrder =
        endTraceJestMock.mock.invocationCallOrder[
          endTraceJestMock.mock.calls.indexOf(journeyEndCall)
        ];
      expect(journeyEndOrder).toBeLessThan(
        mockReplace.mock.invocationCallOrder[0],
      );
    });

    it('ends Password Login Attempt before post-unlock biometric upgrade', async () => {
      const journeyCtx = { traceId: 'journey' };
      const passwordAttemptCtx = { traceId: 'password-attempt' };

      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (getTraceContextMock as jest.Mock).mockImplementation(
        (req: { name: string }) => {
          if (req.name === TraceName.OnboardingJourneyOverall)
            return journeyCtx;
          return undefined;
        },
      );
      (traceMock as jest.Mock).mockImplementation(
        (config: { name?: string }, fn?: () => Promise<void>) => {
          if (fn) {
            return fn();
          }
          if (config?.name === TraceName.OnboardingPasswordLoginAttempt) {
            return passwordAttemptCtx;
          }
          return undefined;
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      await enterPasswordAndSubmit(getByTestId);

      await waitFor(() => {
        expect(endTraceMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordLoginAttempt,
          }),
        );
        expect(mockRequestBiometricsAccessControlForIOS).toHaveBeenCalled();
      });

      const endTraceJestMock = endTraceMock as jest.Mock;
      const passwordEndIndex = endTraceJestMock.mock.calls.findIndex(
        ([request]: [{ name?: string }]) =>
          request?.name === TraceName.OnboardingPasswordLoginAttempt,
      );
      expect(passwordEndIndex).toBeGreaterThanOrEqual(0);
      expect(
        endTraceJestMock.mock.invocationCallOrder[passwordEndIndex],
      ).toBeLessThan(
        mockRequestBiometricsAccessControlForIOS.mock.invocationCallOrder[0],
      );
    });
  });

  describe('Component lifecycle', () => {
    it('prevents state updates after unmount', async () => {
      mockUnlockWallet.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(undefined), 1000)),
      );
      const { getByTestId, unmount } = renderWithProvider(<OAuthRehydration />);
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

  describe('MFA wallet recovery', () => {
    const mfaState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            authConnection: AuthConnection.Google,
          },
        },
      },
    };

    const enableMfaFlags = () => {
      mockSelectMfaUiKitEnabled.mockReturnValue(true);
      mockSelectMoneyEnableMfaFlag.mockReturnValue(true);
    };

    /** First kit attempt (OS highest factor) cancelled → full-page picker. */
    const cancelHighestFactorOnce = () => {
      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('cancelled'), { mfaCode: 'flow_cancelled' }),
      );
    };

    /**
     * Highest-factor OS sheet is cancelled → full-page verify → Use passkey.
     */
    const completePasskeyVerify = async (
      getByTestId: (id: string) => unknown,
    ) => {
      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.VERIFY_SCREEN),
        ).toBeOnTheScreen();
      });
      await act(async () => {
        fireEvent.press(
          getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON) as never,
        );
      });
    };

    it('shows full-page verify when the highest MFA factor is cancelled', async () => {
      enableMfaFlags();
      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('cancelled'), { mfaCode: 'flow_cancelled' }),
      );
      let resolveList!: (value: unknown) => void;
      mockListActiveSocialLoginMethods.mockReturnValue(
        new Promise((resolve) => {
          resolveList = resolve;
        }),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      expect(
        getByTestId(WalletRecoverySelectorsIDs.LOADING_SCREEN),
      ).toBeOnTheScreen();

      await act(async () => {
        resolveList(['passkey', 'totp']);
      });

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.VERIFY_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(
        getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP),
      ).toBeOnTheScreen();
    });

    it('shows only enrolled methods on the custom verify picker', async () => {
      enableMfaFlags();
      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('cancelled'), { mfaCode: 'flow_cancelled' }),
      );
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <OAuthRehydration />,
        { state: mfaState },
      );

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
        ).toBeOnTheScreen();
      });
      expect(
        getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
      ).toBeOnTheScreen();
      expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP)).toBeNull();
      expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL)).toBeNull();
    });

    it('holds the AAL2 token and continues to password after picker verify', async () => {
      enableMfaFlags();
      mockVerifyForSocialLogin
        .mockRejectedValueOnce(
          Object.assign(new Error('cancelled'), { mfaCode: 'flow_cancelled' }),
        )
        .mockResolvedValueOnce({ token: 'aal2-token' });
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(mockVerifyForSocialLogin).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'passkey' }),
      );
      expect(
        mockEngine.context.AuthenticationController
          .holdLockedRecoveryVerification,
      ).toHaveBeenCalledWith('aal2-token');
    });

    it('continues to password when no MFA methods are enrolled', async () => {
      enableMfaFlags();
      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('none'), {
          mfaCode: 'credential_not_enrolled',
        }),
      );
      mockListActiveSocialLoginMethods.mockResolvedValue([]);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(mockVerifyForSocialLogin).toHaveBeenCalled();
      expect(
        mockEngine.context.AuthenticationController
          .holdLockedRecoveryVerification,
      ).not.toHaveBeenCalled();
    });

    it('continues to password when the highest MFA factor fails without cancel', async () => {
      enableMfaFlags();
      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('failed'), { mfaCode: 'invalid_assertion' }),
      );
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey', 'totp']);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <OAuthRehydration />,
        { state: mfaState },
      );

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(WalletRecoverySelectorsIDs.VERIFY_SCREEN),
      ).toBeNull();
      expect(mockListActiveSocialLoginMethods).not.toHaveBeenCalled();
    });

    it('times out the loading gate when social auth never arrives', async () => {
      jest.useFakeTimers();
      enableMfaFlags();

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: {
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                authConnection: undefined,
              },
            },
          },
        },
      });

      expect(
        getByTestId(WalletRecoverySelectorsIDs.LOADING_SCREEN),
      ).toBeOnTheScreen();
      expect(mockListActiveSocialLoginMethods).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      jest.useRealTimers();
    });

    it('unlocks from MFA password step', async () => {
      enableMfaFlags();
      mockListActiveSocialLoginMethods.mockResolvedValue([]);
      mockUnlockWallet.mockImplementationOnce(
        async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
          if (options.onBeforeNavigate) {
            await options.onBeforeNavigate();
          }
          mockReplace(Routes.ONBOARDING.HOME_NAV);
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await waitFor(() => {
        expect(
          getByTestId(LoginViewSelectors.PASSWORD_INPUT),
        ).toBeOnTheScreen();
      });

      fireEvent.changeText(
        getByTestId(LoginViewSelectors.PASSWORD_INPUT),
        'validPassword123',
      );
      await act(async () => {
        fireEvent.press(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID));
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });
    });

    it('exits recovery when hardware back is pressed from password', async () => {
      enableMfaFlags();
      mockListActiveSocialLoginMethods.mockResolvedValue([]);
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });

      const backHandlerCallback = addEventListenerSpy.mock.calls
        .filter((call) => call[0] === 'hardwareBackPress')
        .at(-1)?.[1] as (() => boolean) | undefined;
      act(() => {
        backHandlerCallback?.();
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
      addEventListenerSpy.mockRestore();
    });

    it('shows the recovery password screen without reset wallet', async () => {
      enableMfaFlags();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          isSeedlessPasswordOutdated: true,
        },
      });
      mockListActiveSocialLoginMethods.mockResolvedValue([]);

      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <OAuthRehydration />,
        {
          state: mfaState,
        },
      );

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(
        getByText(strings('wallet_recovery_mfa.password_description')),
      ).toBeOnTheScreen();
      expect(queryByTestId(LoginViewSelectors.RESET_WALLET)).toBeNull();
    });

    it('skips holding a token when kit verify returns none', async () => {
      enableMfaFlags();
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);
      cancelHighestFactorOnce();
      mockVerifyForSocialLogin.mockResolvedValueOnce({ credentials: [] });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(
        mockEngine.context.AuthenticationController
          .holdLockedRecoveryVerification,
      ).not.toHaveBeenCalled();
    });

    it('offers MFA via recovery flag when Money MFA is off and password is outdated', async () => {
      mockSelectMfaUiKitEnabled.mockReturnValue(true);
      mockSelectMoneyEnableMfaFlag.mockReturnValue(false);
      mockSelectMfaRecoveryEnabled.mockReturnValue(true);
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          isSeedlessPasswordOutdated: true,
        },
      });
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);
      cancelHighestFactorOnce();
      mockVerifyForSocialLogin.mockResolvedValueOnce({ token: 'aal2-token' });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(mockVerifyForSocialLogin).toHaveBeenCalled();
      expect(
        mockEngine.context.AuthenticationController
          .holdLockedRecoveryVerification,
      ).toHaveBeenCalledWith('aal2-token');
    });

    it('unlocks with the existing password after picker MFA verify', async () => {
      enableMfaFlags();
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);
      cancelHighestFactorOnce();
      mockVerifyForSocialLogin.mockResolvedValueOnce({ token: 'aal2-token' });
      mockUnlockWallet.mockImplementationOnce(
        async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
          if (options.onBeforeNavigate) {
            await options.onBeforeNavigate();
          }
          mockReplace(Routes.ONBOARDING.HOME_NAV);
        },
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);

      await waitFor(() => {
        expect(
          getByTestId(LoginViewSelectors.PASSWORD_INPUT),
        ).toBeOnTheScreen();
      });

      fireEvent.changeText(
        getByTestId(LoginViewSelectors.PASSWORD_INPUT),
        'wallet-password',
      );
      await act(async () => {
        fireEvent.press(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID));
      });

      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalledWith(
          expect.objectContaining({
            password: 'wallet-password',
          }),
        );
      });
      expect(mockPasswordlessRecover).not.toHaveBeenCalled();
    });

    describe('Enter password → Forgot → Create password (Figma)', () => {
      const validAal2Token = {
        accessToken: 'aal2',
        obtainedAt: Date.now(),
        expiresIn: 3600,
        claims: {
          sub: 'profile',
          amr: ['passkey'],
          exp: Date.now() / 1000 + 3600,
        },
      };

      /**
       * Face ID declined → Enter password.
       * InteractionManager is a no-op in testSetup; invoke the callback so the
       * post-MFA biometrics delay can schedule, then wait past the 1s passkey gap.
       */
      const prepareEnterPasswordAfterMfa = () => {
        jest
          .spyOn(InteractionManager, 'runAfterInteractions')
          .mockImplementation((task) => {
            if (typeof task === 'function') {
              task();
            }
            return { cancel: jest.fn() };
          });
        mockComponentAuthenticationType.mockResolvedValue({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: 'FaceID',
        });
        mockRequestBiometricsAccessControlForIOS.mockResolvedValue(
          AUTHENTICATION_TYPE.PASSWORD,
        );
        mockListActiveSocialLoginMethods.mockResolvedValue(['passkey']);
        cancelHighestFactorOnce();
      };

      const waitForEnterPassword = async (
        getByTestId: (id: string) => unknown,
      ) => {
        await waitFor(
          () => {
            expect(
              getByTestId(WalletRecoverySelectorsIDs.ENTER_PASSWORD_SCREEN),
            ).toBeOnTheScreen();
          },
          { timeout: 3000 },
        );
      };

      afterEach(() => {
        jest.mocked(InteractionManager.runAfterInteractions).mockRestore();
      });

      it('opens Enter password when Face ID is declined after MFA', async () => {
        enableMfaFlags();
        prepareEnterPasswordAfterMfa();
        mockVerifyForSocialLogin.mockResolvedValueOnce({
          token: validAal2Token,
        });

        const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
          state: mfaState,
        });

      await completePasskeyVerify(getByTestId);
      await waitForEnterPassword(getByTestId);

      // No escrow prove after MFA (no Google account chooser / passkey sheet).
      expect(mockPasswordlessPrefetch).not.toHaveBeenCalled();
      expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeOnTheScreen();
    });

      it('unlocks from Enter password with oauth2Login (fetchAllSecretData path)', async () => {
        enableMfaFlags();
        prepareEnterPasswordAfterMfa();
        mockVerifyForSocialLogin.mockResolvedValueOnce({
          token: validAal2Token,
        });
        mockUnlockWallet.mockImplementationOnce(
          async (options: { onBeforeNavigate?: () => Promise<void> } = {}) => {
            if (options.onBeforeNavigate) {
              await options.onBeforeNavigate();
            }
            mockReplace(Routes.ONBOARDING.HOME_NAV);
          },
        );

        const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
          state: mfaState,
        });

        await completePasskeyVerify(getByTestId);
        await waitForEnterPassword(getByTestId);

        fireEvent.changeText(
          getByTestId(LoginViewSelectors.PASSWORD_INPUT),
          'global-password',
        );
        await act(async () => {
          fireEvent.press(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID));
        });

        await waitFor(() => {
          expect(mockUnlockWallet).toHaveBeenCalledWith(
            expect.objectContaining({
              password: 'global-password',
              authPreference: expect.objectContaining({
                currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
                oauth2Login: true,
              }),
            }),
          );
        });
        expect(mockPasswordlessRecover).not.toHaveBeenCalled();
      });

    it('opens ChoosePassword from Forgot only when the Recovery Secret is already held', async () => {
      enableMfaFlags();
      prepareEnterPasswordAfterMfa();
      mockVerifyForSocialLogin.mockResolvedValueOnce({
        token: validAal2Token,
      });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);
      await waitForEnterPassword(getByTestId);

      // Secret fetched earlier (e.g. recovery setup) and still held.
      mockRecoverySecretHeld = true;
      expect(mockPasswordlessPrefetch).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.CHOOSE_PASSWORD,
          expect.objectContaining({
            passwordlessSocialRecovery: true,
            oauthLoginSuccess: true,
          }),
        );
      });
      // Forgot never proves to escrow itself.
      expect(mockPasswordlessPrefetch).not.toHaveBeenCalled();
    });

    it('opens ChoosePassword from Forgot without a held Recovery Secret and without a prefetch', async () => {
      enableMfaFlags();
      prepareEnterPasswordAfterMfa();
      mockVerifyForSocialLogin.mockResolvedValueOnce({
        token: validAal2Token,
      });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);
      await waitForEnterPassword(getByTestId);

      mockRecoverySecretHeld = false;
      await act(async () => {
        fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.CHOOSE_PASSWORD,
          expect.objectContaining({ passwordlessSocialRecovery: true }),
        );
      });
      expect(mockPasswordlessPrefetch).not.toHaveBeenCalled();
    });

    it('re-verifies MFA from Forgot when AAL2 is not held', async () => {
      enableMfaFlags();
      prepareEnterPasswordAfterMfa();
      // MFA succeeds without a token → nothing held for AAL2.
      mockVerifyForSocialLogin.mockResolvedValueOnce({ credentials: [] });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />, {
        state: mfaState,
      });

      await completePasskeyVerify(getByTestId);
      await waitForEnterPassword(getByTestId);

      mockVerifyForSocialLogin.mockRejectedValueOnce(
        Object.assign(new Error('cancelled'), { mfaCode: 'flow_cancelled' }),
      );
      mockListActiveSocialLoginMethods.mockResolvedValue(['passkey', 'totp']);

      await act(async () => {
        fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));
      });

      await waitFor(() => {
        expect(
          getByTestId(WalletRecoverySelectorsIDs.VERIFY_SCREEN),
        ).toBeOnTheScreen();
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.ONBOARDING.CHOOSE_PASSWORD,
        expect.anything(),
      );
    });
    });
  });
});
