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
import StorageWrapper from '../../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  OPTIN_META_METRICS_UI_SEEN,
} from '../../../constants/storage';
import { EndTraceRequest } from '../../../util/trace';
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
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('handleVaultCorruption', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to restore wallet screen when vault is corrupted and password is valid', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce('mock-seed');

      jest
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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

  describe('handleSeedlessOnboardingControllerError - Non-OAuth', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
    });

    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.clearAllTimers();
      jest.useRealTimers();
      mockRoute.mockClear();
    });

    it('handle countdown behavior and disable input during tooManyAttemptsError', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 1 },
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

      let errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.too_many_attempts', { remainingTime: '0:00:03' }),
      );

      expect(passwordInput.props.editable).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        strings('login.too_many_attempts', { remainingTime: '0:00:02' }),
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        strings('login.too_many_attempts', { remainingTime: '0:00:01' }),
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
        .spyOn(Authentication, 'userEntryAuth')
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
        .spyOn(Authentication, 'userEntryAuth')
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
      mockPromptSeedlessRelogin.mockClear();
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        'generic error cases',
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

      // For unlock flow, generic recovery errors prompt seedless re-login
      await waitFor(() => {
        expect(mockPromptSeedlessRelogin).toHaveBeenCalled();
      });
    });
  });

  describe('updateBiometryChoice', () => {
    it('updates biometry choice to disabled when biometric auth is cancelled', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );

      jest
        .spyOn(Authentication, 'userEntryAuth')
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

  describe('Non-OAuth Login Success Flow', () => {
    afterEach(() => {
      jest.clearAllTimers();
      mockNavigate.mockReset();
      jest.clearAllMocks();
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
  });

  describe('Global Password changed', () => {
    afterEach(() => {
      jest.clearAllTimers();
    });

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

    afterEach(() => {
      jest.clearAllTimers();
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

    it('captures exception when metrics enabled and OAuth login fails', async () => {
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
