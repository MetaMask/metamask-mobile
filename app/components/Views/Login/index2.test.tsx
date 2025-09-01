import React from 'react';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import Login from './index';
import { fireEvent, act } from '@testing-library/react-native';
import { VAULT_ERROR } from './constants';

import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';

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
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import { EndTraceRequest, TraceName } from '../../../util/trace';
import ReduxService from '../../../core/redux/ReduxService';
import { RecursivePartial } from '../../../core/Authentication/Authentication.test';
import { RootState } from '../../../reducers';
import { ReduxStore } from '../../../core/redux/types';

const mockEngine = jest.mocked(Engine);

// Mock useMetrics with a dynamic isEnabled function
const mockIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useMetrics', () => {
  const actualUseMetrics = jest.requireActual('../../hooks/useMetrics');
  return {
    ...actualUseMetrics,
    useMetrics: jest.fn().mockReturnValue({
      ...actualUseMetrics.useMetrics,
      isEnabled: () => mockIsEnabled(),
    }),
  };
});

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

    it('should handle countdown behavior and disable input during tooManyAttemptsError', async () => {
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

    it('should clean up timeout on component unmount during countdown', async () => {
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

    it('should handle OAuth login success when metrics UI is seen', async () => {
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

    it('should handle OAuth login success when metrics UI is not seen', async () => {
      mockIsEnabled.mockReturnValue(false);
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
          onboardingTraceCtx: 'mockTraceContext',
        },
      });
      (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) return null; // Not seen
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
      expect(mockReset).toHaveBeenCalledWith({
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
      mockIsEnabled.mockReturnValue(true);
    });

    it('should replace navigation when non-OAuth login ', async () => {
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
  });
});
