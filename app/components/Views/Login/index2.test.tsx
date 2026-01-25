import React from 'react';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import Login from './index';
import { fireEvent, act, screen, waitFor } from '@testing-library/react-native';
import { VAULT_ERROR } from './constants';

import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';

import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';

// Mock dependencies
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

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

jest.mock('../../UI/ScreenshotDeterrent', () => ({
  ScreenshotDeterrent: () => null,
}));

describe('Login test suite 2', () => {
  const createMockReduxStore = (
    stateOverrides?: RecursivePartial<RootState>,
  ) => {
    const defaultState = {
      user: {
        existingUser: false,
      },
      security: {
        allowLoginWithRememberMe: false,
      },
      settings: {
        lockTime: -1,
      },
      ...(stateOverrides || {}),
    } as RecursivePartial<RootState>;

    return {
      dispatch: jest.fn(),
      getState: jest.fn(() => defaultState),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    } as unknown as ReduxStore;
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest
      .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
      .mockResolvedValue(false);

    // Mock Redux store for all tests
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    // Restore Redux store mock after clearing mocks
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  afterAll(() => {
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
        .spyOn(Authentication, 'updateAuthPreference')
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

      // Mock getVaultFromBackup to return an error to trigger error handling
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'Store password failed',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
      });
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
        user: {
          existingUser: false,
        },
        security: {
          allowLoginWithRememberMe: false,
        },
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
        subscribe: jest.fn(),
        replaceReducer: jest.fn(),
        [Symbol.observable]: jest.fn(),
      } as unknown as ReduxStore);
      jest.spyOn(Authentication, 'userEntryAuth').mockResolvedValue(undefined);
      jest
        .spyOn(Authentication, 'updateAuthPreference')
        .mockResolvedValue(undefined);

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
  });
});
