import React from 'react';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import Login from './index';
import { fireEvent, act, screen, waitFor } from '@testing-library/react-native';
import { VAULT_ERROR } from './constants';

import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';

import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';

// Mock dependencies
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { updateAuthTypeStorageFlags } from '../../../util/authentication';

import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import OAuthService from '../../../core/OAuthService/OAuthService';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  OPTIN_META_METRICS_UI_SEEN,
} from '../../../constants/storage';
import { EndTraceRequest, TraceName } from '../../../util/trace';
import ReduxService from '../../../core/redux/ReduxService';
import { RecursivePartial } from '../../../core/Authentication/Authentication.test';
import { RootState } from '../../../reducers';
import { ReduxStore } from '../../../core/redux/types';
import { BIOMETRY_TYPE } from 'react-native-keychain';

const mockEngine = jest.mocked(Engine);

// Mock useMetrics with a dynamic isEnabled function
const mockIsEnabled = jest.fn().mockReturnValue(true);
const mockEnable = jest.fn().mockResolvedValue(undefined);
jest.mock('../../hooks/useMetrics', () => {
  const actualUseMetrics = jest.requireActual('../../hooks/useMetrics');
  return {
    ...actualUseMetrics,
    useMetrics: jest.fn().mockReturnValue({
      ...actualUseMetrics.useMetrics,
      isEnabled: () => mockIsEnabled(),
      enable: mockEnable,
    }),
  };
});

// Mock usePromptSeedlessRelogin hook
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
const mockReset = jest.fn();
const mockGoBack = jest.fn();

const mockRoute = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: jest.fn(),
      submitPassword: jest.fn(),
    },
    SeedlessOnboardingController: {
      submitGlobalPassword: jest.fn(),
    },
    MultichainAccountService: {
      init: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../../util/mnemonic', () => ({
  uint8ArrayToMnemonic: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
      reset: mockReset,
      goBack: mockGoBack,
    }),
    useRoute: () => mockRoute(),
  };
});
jest.mock('../../../util/authentication', () => ({
  updateAuthTypeStorageFlags: jest.fn(),
}));

jest.mock('../../../util/validators', () => ({
  parseVaultValue: jest.fn(),
}));

jest.mock('../../../core/BackupVault', () => ({
  getVaultFromBackup: jest.fn(),
}));

const mockGetVaultFromBackup = getVaultFromBackup as jest.Mock;

const mockParseVaultValue = parseVaultValue as jest.Mock;

const mockEndTrace = jest.fn();

jest.mock('../../../util/trace', () => {
  const actualTrace = jest.requireActual('../../../util/trace');
  return {
    ...actualTrace,
    endTrace: (request: EndTraceRequest) => mockEndTrace(request),
  };
});

jest.mock('../../../multichain-accounts/AccountTreeInitService', () => ({
  initializeAccountTree: jest.fn().mockResolvedValue(undefined),
}));

// Mock useNetInfo hook
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
    },
  })),
}));

const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(false);

jest.mock('../../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

describe('Login test suite 2', () => {
  describe('handleVaultCorruption', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handle vault corruption successfully with valid password', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce('mock-seed');

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        });

      jest
        .spyOn(Authentication, 'storePassword')
        .mockResolvedValueOnce(undefined);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.VAULT_RECOVERY.RESTORE_WALLET,
        expect.objectContaining({
          params: {
            previousScreen: Routes.ONBOARDING.LOGIN,
          },
          screen: Routes.VAULT_RECOVERY.RESTORE_WALLET,
        }),
      );
    });

    it('show error for invalid password during vault corruption', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce(undefined);

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'invalid-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when password requirements are not met', async () => {
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, '123'); // Too short password
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when backup has error', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'Backup error',
      });
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when storePassword fails', async () => {
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce('mock-seed');

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        });

      jest
        .spyOn(Authentication, 'storePassword')
        .mockRejectedValueOnce(new Error('Store password failed'));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when vault seed cannot be parsed', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce(undefined);

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });
  });

  describe('handleSeedlessOnboardingControllerError', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      mockRoute.mockClear();
    });

    it('handle seedless onboarding controller error with remaining time of > 0', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 1, numberOfAttempts: 1 },
      );

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
      await act(async () => {
        fireEvent.press(loginButton);
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0:00:01',
      );
    });

    it('handle countdown behavior and disable input during tooManyAttemptsError', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 1 },
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      let errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0:00:03',
      );

      expect(passwordInput.props.editable).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0:00:02',
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0:00:01',
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(() => getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toThrow();
      expect(passwordInput.props.editable).not.toBe(false);
    });

    it('clean up timeout on component unmount during countdown', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 5, numberOfAttempts: 1 },
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('handle SeedlessOnboardingControllerRecoveryError Invalid Password', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('handle generic SeedlessOnboardingControllerRecoveryError (else case)', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        'generic error cases',
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual('Error: generic error cases');

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('handle generic error when metrics are disabled', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      mockIsEnabled.mockReturnValue(false);

      const seedlessError = new Error(
        'SeedlessOnboardingController - generic error cases',
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByText, getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Expect ErrorBoundary UI instead of login form error
      expect(getByText('An error occurred')).toBeTruthy();
      expect(
        getByText(
          'Send us an error report to help fix the problem and improve MetaMask. It will be confidential and anonymous.',
        ),
      ).toBeTruthy();

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      mockIsEnabled.mockReturnValue(true);
      clearTimeoutSpy.mockRestore();
    });

    it('handle generic error when metrics are enabled', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      mockIsEnabled.mockReturnValue(true);

      const seedlessError = new Error(
        'SeedlessOnboardingController - generic error cases',
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Expect normal login form error instead of ErrorBoundary
      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual('generic error cases');

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('handleSyncPasswordAndUnlockWallet', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
    });

    it('handle seedless onboarding controller error on syncPasswordAndUnlockWallet', async () => {
      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValue(true);

      // mock keyring controller verifyPassword
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );
      mockEngine.context.SeedlessOnboardingController.submitGlobalPassword.mockRejectedValue(
        new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
      );

      const { getByTestId } = renderWithProvider(<Login />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
      await act(async () => {
        fireEvent.press(loginButton);
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.seedless_password_outdated'),
      );
    });
  });
  describe('updateBiometryChoice', () => {
    it('update biometry choice to disabled', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error('Error: Cancel'));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(updateAuthTypeStorageFlags).toHaveBeenCalledWith(false);

      mockRoute.mockClear();
    });
  });

  describe('OAuth Login', () => {
    afterEach(() => {
      mockNavigate.mockReset();
      jest.clearAllMocks();
    });

    it('navigate back and reset OAuth state', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      const spyResetOauthState = jest.spyOn(OAuthService, 'resetOauthState');
      const { getByTestId } = renderWithProvider(<Login />);

      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      await act(async () => {
        fireEvent.press(otherMethodsButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(spyResetOauthState).toHaveBeenCalled();
    });

    it('handle OAuth login success when metrics UI is seen', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          onboardingTraceCtx: 'mockTraceContext',
        },
      });
      (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) return true;
        return null;
      });

      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'mock-vault',
            },
          },
        },
      };
      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      jest.spyOn(Authentication, 'storePassword').mockResolvedValue(undefined);
      const spyRehydrateSeedPhrase = jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockResolvedValue(undefined);

      mockEndTrace.mockClear();
      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(spyRehydrateSeedPhrase).toHaveBeenCalled();
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordLoginAttempt,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingExistingSocialLogin,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingJourneyOverall,
      });
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('handle non OAuth login success when metrics UI is not seen', async () => {
      mockIsEnabled.mockReturnValue(false);
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) return true;
        return null;
      });
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: undefined,
            },
          },
        },
      };
      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);
      jest.spyOn(Authentication, 'storePassword').mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('replace navigation when non-OAuth login', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          onboardingTraceCtx: 'mockTraceContext',
        },
      });
      (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) return true;
        return null;
      });

      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'mock-vault',
            },
          },
        },
      };
      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      jest.spyOn(Authentication, 'storePassword').mockResolvedValue(undefined);
      const spyRehydrateSeedPhrase = jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockResolvedValue(undefined);

      mockEndTrace.mockClear();
      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(spyRehydrateSeedPhrase).toHaveBeenCalled();
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordLoginAttempt,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingExistingSocialLogin,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingJourneyOverall,
      });
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      expect(mockReset).not.toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.OPTIN_METRICS,
              },
            },
          },
        ],
      });
    });
  });

  describe('Global Password changed', () => {
    it('show biometric when password is not outdated', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'mock-vault',
              passwordOutdatedCache: {
                isExpiredPwd: false,
                timestamp: 1718332800,
              },
            },
          },
        },
      };
      // mock redux service
      jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => ({
        dispatch: jest.fn(),
        subscribe: jest.fn(),
        replaceReducer: jest.fn(),
        [Symbol.observable]: jest.fn(),
        getState: jest.fn().mockReturnValue(mockState),
      }));

      // mock storage wrapper
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === BIOMETRY_CHOICE_DISABLED) return false;
        return null;
      });

      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue();

      jest.spyOn(Authentication, 'getType').mockImplementation(async () => ({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      }));

      renderWithProvider(<Login />, {
        // @ts-expect-error - mock state
        state: mockState,
      });

      expect(
        screen.queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON),
      ).not.toBeTruthy();

      await waitFor(
        () => {
          expect(
            screen.queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON),
          ).toBeTruthy();
        },
        { timeout: 4000 },
      );
    });

    it('show error and disable biometric accesory when password is outdated', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'mock-vault',
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: 1718332800,
              },
            },
          },
        },
      };

      // mock storage wrapper
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === BIOMETRY_CHOICE_DISABLED) return false;
        return null;
      });

      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue();

      jest.spyOn(Authentication, 'getType').mockImplementation(async () => ({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      }));

      renderWithProvider(<Login />, {
        // @ts-expect-error - mock state
        state: mockState,
      });

      const errorElement = screen.queryByTestId(
        LoginViewSelectors.PASSWORD_ERROR,
      );
      expect(errorElement).toBeTruthy();
      expect(errorElement?.children[0]).toEqual(
        strings('login.seedless_password_outdated'),
      );

      expect(
        screen.queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON),
      ).not.toBeTruthy();

      await waitFor(() => {
        expect(
          screen.queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON),
        ).not.toBeTruthy();
      });
    });
  });

  describe('usePromptSeedlessRelogin hook integration - non rehydrate flow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPromptSeedlessRelogin.mockClear();
      mockIsDeletingInProgress.mockReturnValue(false);
    });

    it('display loading state when isDeletingInProgress is true', async () => {
      mockIsDeletingInProgress.mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<Login />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Button should be disabled when isDeletingInProgress is true
      expect(loginButton.props.disabled).toBe(true);
    });

    it('call promptSeedlessRelogin when OAuth login fails with generic error', async () => {
      mockIsDeletingInProgress.mockReturnValue(false);
      mockIsEnabled.mockReturnValue(true);

      const seedlessError = new Error(
        'SeedlessOnboardingController - OAuth rehydration failed',
      );
      jest
        .spyOn(Authentication, 'userEntryAuth')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockPromptSeedlessRelogin).toHaveBeenCalledTimes(1);
    });

    it('disable login button when isDeletingInProgress is true', async () => {
      mockIsDeletingInProgress.mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });

      // Even with valid password, button should be disabled when isDeletingInProgress is true
      expect(loginButton.props.disabled).toBe(true);
    });

    it('handle SeedlessOnboardingControllerError PasswordRecentlyUpdated', async () => {
      mockIsDeletingInProgress.mockReturnValue(false);

      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );

      jest
        .spyOn(Authentication, 'userEntryAuth')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        strings('login.seedless_password_outdated'),
      );
    });

    it('not call promptSeedlessRelogin for rehydrate flow', async () => {
      mockIsDeletingInProgress.mockReturnValue(false);
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true, // rehydrate flow
        },
      });

      const seedlessError = new Error(
        'SeedlessOnboardingController - Generic error',
      );
      jest
        .spyOn(Authentication, 'userEntryAuth')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Should show error message instead of calling promptSeedlessRelogin
      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual('Generic error');
      expect(mockPromptSeedlessRelogin).not.toHaveBeenCalled();
    });

    it('capture exception when metrics enabled and OAuth login fails', async () => {
      mockIsDeletingInProgress.mockReturnValue(false);
      mockIsEnabled.mockReturnValue(true);

      // Set up route params for non-OAuth login scenario
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });

      const seedlessError = new Error(
        'SeedlessOnboardingController - OAuth rehydration failed',
      );
      jest
        .spyOn(Authentication, 'userEntryAuth')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockPromptSeedlessRelogin).toHaveBeenCalledTimes(1);
    });

    it('handle finalLoading state correctly', async () => {
      // Test when both loading and isDeletingInProgress are false
      mockIsDeletingInProgress.mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });

      // Button should be enabled when both loading states are false and password is valid
      expect(loginButton.props.disabled).toBe(false);

      // Test when isDeletingInProgress is true
      mockIsDeletingInProgress.mockReturnValue(true);

      // Re-render to get updated state
      const { getByTestId: getByTestIdUpdated } = renderWithProvider(<Login />);
      const loginButtonUpdated = getByTestIdUpdated(
        LoginViewSelectors.LOGIN_BUTTON_ID,
      );
      const passwordInputUpdated = getByTestIdUpdated(
        LoginViewSelectors.PASSWORD_INPUT,
      );

      await act(async () => {
        fireEvent.changeText(passwordInputUpdated, 'valid-password123');
      });

      // Button should be disabled when isDeletingInProgress is true
      expect(loginButtonUpdated.props.disabled).toBe(true);
    });
  });
});
