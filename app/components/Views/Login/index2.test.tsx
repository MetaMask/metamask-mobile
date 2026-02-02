import React from 'react';
import { LoginViewSelectors } from './LoginView.testIds';
import Login from './index';
import { fireEvent, act, screen, waitFor } from '@testing-library/react-native';
import { VAULT_ERROR } from './constants';

import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';

import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import { UNLOCK_WALLET_ERROR_MESSAGES } from '../../../core/Authentication/constants';

// Mock dependencies
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import { BIOMETRY_CHOICE_DISABLED } from '../../../constants/storage';
import { EndTraceRequest } from '../../../util/trace';
import ReduxService from '../../../core/redux/ReduxService';
import { RecursivePartial } from '../../../core/Authentication/Authentication.test';
import { RootState } from '../../../reducers';
import { ReduxStore } from '../../../core/redux/types';
import { BIOMETRY_TYPE } from 'react-native-keychain';

const mockEngine = jest.mocked(Engine);

jest.mock('../../../util/Logger');
const mockLogger = Logger as jest.Mocked<typeof Logger>;

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
  passcodeType: jest.fn().mockReturnValue('passcode_ios'),
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
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
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

      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

      mockComponentAuthenticationType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      });

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

      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

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
      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

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
      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

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
      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

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

      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));

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
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );

      mockUnlockWallet.mockRejectedValue(new Error('Error: Cancel'));

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

      mockGetAuthType.mockImplementation(async () => ({
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

  describe('biometric cancellation', () => {
    it('does not log error when Android biometric auth is cancelled', async () => {
      // Arrange
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      mockUnlockWallet.mockRejectedValue(new Error('Cancel'));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('does not log error when iOS biometric auth is cancelled', async () => {
      // Arrange
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      mockUnlockWallet.mockRejectedValue(
        new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
