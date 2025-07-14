import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent, act } from '@testing-library/react-native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { InteractionManager } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';
import { passwordRequirementsMet } from '../../../util/password';
import { trace } from '../../../util/trace';
import StorageWrapper from '../../../store/storage-wrapper';

// Mock dependencies
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { VAULT_ERROR } from './constants';
import { RecoveryError as SeedlessOnboardingControllerRecoveryError } from '@metamask/seedless-onboarding-controller';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = jest.fn();
const mockReset = jest.fn();

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

const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

// Mock password requirements
jest.mock('../../../util/password', () => ({
  passwordRequirementsMet: jest.fn(),
}));

// Mock trace utility
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    AuthenticateUser: 'Authenticate User',
    Login: 'Login',
    Signature: 'Signature',
    Middleware: 'Middleware',
    PPOMValidation: 'PPOM Validation',
    NotificationDisplay: 'Notification Display',
  },
  TraceOperation: {
    Login: 'login',
    BiometricAuthentication: 'biometrics.authentication',
  },
}));

// Mock react-native with Keyboard
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Keyboard: {
    dismiss: jest.fn(),
  },
}));

// Mock StorageWrapper
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock setOnboardingWizardStep action
jest.mock('../../../actions/wizard', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({
    currentAuthType: 'device_passcode',
    availableBiometryType: 'TouchID',
  }),
  componentAuthenticationType: jest.fn().mockResolvedValue({
    currentAuthType: 'device_passcode',
    availableBiometryType: 'TouchID',
  }),
  rehydrateSeedPhrase: jest.fn(),
  storePassword: jest.fn(),
  userEntryAuth: jest.fn(),
  appTriggeredAuth: jest.fn(),
  lockApp: jest.fn(),
}));

jest.mock('../../../actions/security', () => ({
  setAllowLoginWithRememberMe: jest.fn(() => ({
    type: 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
    enabled: true,
  })),
  ActionType: {
    SET_ALLOW_LOGIN_WITH_REMEMBER_ME: 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
  },
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

jest.mock('../../../util/authentication', () => ({
  passcodeType: jest.fn(),
  updateAuthTypeStorageFlags: jest.fn(),
}));

jest.mock('../../../core/BackupVault', () => ({
  getVaultFromBackup: jest.fn(),
}));

jest.mock('../../../util/validators', () => ({
  parseVaultValue: jest.fn(),
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  resetOauthState: jest.fn(),
}));

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockReplace.mockClear();
    mockGoBack.mockClear();
    mockRoute.mockClear();
    // Default mock implementations
    (passwordRequirementsMet as jest.Mock).mockReturnValue(true);
    (Authentication.userEntryAuth as jest.Mock).mockResolvedValue(undefined);
    (Authentication.componentAuthenticationType as jest.Mock).mockResolvedValue(
      {
        currentAuthType: 'password',
      },
    );
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: 'password',
      availableBiometryType: null,
    });
    (trace as jest.Mock).mockImplementation(async (_, callback) => {
      if (callback) await callback();
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders matching snapshot', () => {
    const { toJSON } = renderWithProvider(<Login />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when password input is focused', () => {
    const { getByTestId, toJSON } = renderWithProvider(<Login />);

    fireEvent.changeText(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT),
      'password',
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('Forgot Password', () => {
    it('show the forgot password modal', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeTruthy();
      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
      });
    });
  });

  describe('onLogin', () => {
    it('login button exists and can be pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      // Act
      fireEvent.changeText(passwordInput, 'testpassword123');
      fireEvent.press(loginButton);

      // Assert
      expect(loginButton).toBeOnTheScreen();
    });

    it('password input accepts text', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'testpassword123');

      // Assert
      expect(passwordInput).toBeTruthy();
    });
  });

  describe('Remember Me Authentication', () => {
    it('should set up remember me authentication when auth type is REMEMBER_ME', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
        availableBiometryType: null,
      });

      renderWithProvider(<Login />);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(setAllowLoginWithRememberMe).toHaveBeenCalledWith(true);
    });
  });

  describe('Passcode Authentication', () => {
    beforeEach(() => {
      (StorageWrapper.getItem as jest.Mock).mockReset();
    });

    it('should set up passcode authentication when auth type is PASSCODE', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });

      renderWithProvider(<Login />);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(passcodeType).toHaveBeenCalledWith(AUTHENTICATION_TYPE.PASSCODE);
    });
  });

  describe('handleVaultCorruption', () => {
    beforeEach(() => {
      (Authentication.rehydrateSeedPhrase as jest.Mock).mockRejectedValue(
        new Error(VAULT_ERROR),
      );
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

    it('should handle vault corruption successfully with valid password', async () => {
      (getVaultFromBackup as jest.Mock).mockResolvedValueOnce({
        vault: 'mock-vault',
      });
      (parseVaultValue as jest.Mock).mockResolvedValueOnce('mock-seed');
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      });
      (Authentication.storePassword as jest.Mock).mockResolvedValueOnce(
        undefined,
      );

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

    it('should show error for invalid password during vault corruption', async () => {
      (getVaultFromBackup as jest.Mock).mockResolvedValueOnce({
        vault: 'mock-vault',
      });
      (parseVaultValue as jest.Mock).mockResolvedValueOnce(null);

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

    it('should handle vault corruption when password requirements are not met', async () => {
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

    it('should handle vault corruption when backup has error', async () => {
      (getVaultFromBackup as jest.Mock).mockResolvedValueOnce({
        error: 'Backup error',
      });

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

    it('should handle vault corruption when storePassword fails', async () => {
      (getVaultFromBackup as jest.Mock).mockResolvedValueOnce({
        vault: 'mock-vault',
      });
      (parseVaultValue as jest.Mock).mockResolvedValueOnce('mock-seed');
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      });
      (Authentication.storePassword as jest.Mock).mockRejectedValueOnce(
        new Error('Store password failed'),
      );

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

    it('should handle vault corruption when vault seed cannot be parsed', async () => {
      (getVaultFromBackup as jest.Mock).mockResolvedValueOnce({
        vault: 'mock-vault',
      });
      (parseVaultValue as jest.Mock).mockResolvedValueOnce(undefined);

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
    it('should update biometry choice to disabled', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (Authentication.rehydrateSeedPhrase as jest.Mock).mockRejectedValue(
        new Error('Error: Cancel'),
      );

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

  describe('handleUseOtherMethod', () => {
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

    it('should navigate back and reset OAuth state', async () => {
      const { getByTestId } = renderWithProvider(<Login />);

      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      await act(async () => {
        fireEvent.press(otherMethodsButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
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

    it('should handle seedless onboarding controller error with remaining time of > 0', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        'SeedlessOnboardingController - Too many attempts',
        { remainingTime: 1, numberOfAttempts: 1 },
      );
      (Authentication.rehydrateSeedPhrase as jest.Mock).mockRejectedValue(
        seedlessError,
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
        'Too many attempts. Please try again in 0m:1s',
      );
    });

    it('should handle seedless onboarding controller error without remaining time', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        'SeedlessOnboardingController - Too many attempts',
        { remainingTime: 0, numberOfAttempts: 1 },
      );
      (Authentication.rehydrateSeedPhrase as jest.Mock).mockRejectedValue(
        seedlessError,
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
      expect(errorElement.props.children).toEqual('Too many attempts');
    });
  });

  describe('tryBiometric', () => {
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

    it('should successfully authenticate with biometrics and navigate to home', async () => {
      (passcodeType as jest.Mock).mockReturnValueOnce('device_passcode');
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValueOnce(
        true,
      );

      const { getByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{
          name: Routes.ONBOARDING.ROOT_NAV,
          params: {
            screen: Routes.ONBOARDING.NAV,
            params: {
              screen: Routes.ONBOARDING.OPTIN_METRICS
            },
          },
        }],
      });
    });

    it('should handle biometric authentication failure', async () => {
      (passcodeType as jest.Mock).mockReturnValueOnce('device_passcode');
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });
      const biometricError = new Error('Biometric authentication failed');
      (Authentication.appTriggeredAuth as jest.Mock).mockRejectedValueOnce(
        biometricError,
      );

      const { getByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      // The component should still show biometric option after failure
      expect(biometryButton).toBeTruthy();
    });
  });
});

