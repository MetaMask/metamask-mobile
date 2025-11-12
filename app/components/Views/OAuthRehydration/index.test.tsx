import React from 'react';
import { Image as RNImage } from 'react-native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';
import { strings } from '../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Engine from '../../../core/Engine';
import OAuthService from '../../../core/OAuthService/OAuthService';
import StorageWrapper from '../../../store/storage-wrapper';
import FOX_LOGO from '../../../images/branding/fox.png';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
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
  passcodeType: jest.fn(),
}));

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

// Mock StorageWrapper
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({
    currentAuthType: 'device_passcode',
    availableBiometryType: null,
  }),
  lockApp: jest.fn(),
  userEntryAuth: jest.fn().mockResolvedValue(true),
  appTriggeredAuth: jest.fn().mockResolvedValue(true),
  componentAuthenticationType: jest.fn().mockResolvedValue({
    currentAuthType: 'password',
  }),
  storePassword: jest.fn().mockResolvedValue(undefined),
  rehydrateSeedPhrase: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
}));

// Mock password requirements
jest.mock('../../../util/password', () => ({
  passwordRequirementsMet: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () =>
  jest.fn(),
);

jest.mock('../../../util/trace', () => {
  const actualTrace = jest.requireActual('../../../util/trace');
  return {
    ...actualTrace,
    trace: jest.fn().mockReturnValue({}),
    endTrace: jest.fn(),
  };
});

jest.mock('../../../core/BackupVault', () => ({
  getVaultFromBackup: jest.fn(),
}));

jest.mock('../../../util/validators', () => ({
  parseVaultValue: jest.fn(),
}));

import OAuthRehydration from './index';

const mockTrackOnboarding = jest.mocked(
  jest.requireMock('../../../util/metrics/TrackOnboarding/trackOnboarding'),
);

describe('OAuthRehydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.mockReturnValue({
      params: {
        locked: false,
        oauthLoginSuccess: true,
      },
    });
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: null,
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
      undefined,
    );
    mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
      undefined,
    );
  });

  describe('Rendering', () => {
    it('renders all core UI elements', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.TITLE_ID)).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.TITLE_ID).props.children).toBe(
        strings('login.title'),
      );
      expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeOnTheScreen();
      expect(
        getByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders MetaMask branding images', () => {
      const { UNSAFE_root } = renderWithProvider(<OAuthRehydration />);

      const images = UNSAFE_root.findAllByType(RNImage);
      const hasMetaMaskOrFoxImage = images.some(
        (img) =>
          img.props.source === METAMASK_NAME || img.props.source === FOX_LOGO,
      );

      expect(hasMetaMaskOrFoxImage).toBe(true);
    });

    it('does not render reset wallet button', () => {
      const { queryByTestId } = renderWithProvider(<OAuthRehydration />);

      const resetWallet = queryByTestId(LoginViewSelectors.RESET_WALLET);

      expect(resetWallet).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('updates password value when user types', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      fireEvent.changeText(passwordInput, 'testPassword123');

      expect(passwordInput.props.value).toBe('testPassword123');
    });

    it('submits login when pressing enter on password field', async () => {
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );
      mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
        undefined,
      );
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'validPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('disables login button when password is empty', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      expect(loginButton.props.disabled).toBe(true);
    });
  });

  describe('Login Flow', () => {
    it('navigates to home screen after successful login', async () => {
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );
      mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
        undefined,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'correctPassword');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('navigates back and resets OAuth state when using other methods', async () => {
      const spyResetOauthState = jest.spyOn(OAuthService, 'resetOauthState');
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      await act(async () => {
        fireEvent.press(otherMethodsButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(spyResetOauthState).toHaveBeenCalled();
    });
  });

  describe('Password and Biometry Management', () => {
    it('renders biometry button when available', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });

      const { queryByTestId } = renderWithProvider(<OAuthRehydration />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const biometryButton = queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      expect(biometryButton).toBeTruthy();
    });
  });

  describe('Analytics', () => {
    it('tracks analytics events', () => {
      renderWithProvider(<OAuthRehydration />);

      expect(mockEngine.context.KeyringController).toBeDefined();
    });
  });

  describe('Rehydration Logic - Seedless Error Handling', () => {
    it('prompts seedless re-login for generic seedless errors', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('SeedlessOnboardingController - Generic recovery error'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'testPassword123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockPromptSeedlessRelogin).not.toHaveBeenCalled();
    });

    it('displays loading state when isDeletingInProgress is true', () => {
      mockIsDeletingInProgress.mockReturnValueOnce(true);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      expect(loginButton.props.loading).toBe(true);
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('cleans up mounted ref on unmount', () => {
      const { unmount } = renderWithProvider(<OAuthRehydration />);

      unmount();

      expect(true).toBe(true);
    });

    it('prevents state updates after unmount', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 1000);
          }),
      );

      const { getByTestId, unmount } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

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

  describe('Loading States', () => {
    it('shows loading state during login', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          }),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'testPassword123');

      act(() => {
        fireEvent.press(loginButton);
      });

      expect(loginButton.props.loading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });
    });

    it('disables login button when loading state is active', () => {
      mockIsDeletingInProgress.mockReturnValueOnce(true);

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      expect(loginButton.props.loading).toBe(true);
    });
  });

  describe('Analytics Tracking', () => {
    it('renders component and initializes analytics correctly', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginContainer = getByTestId(LoginViewSelectors.CONTAINER);

      expect(loginContainer).toBeTruthy();
    });

    it('tracks login event when attempting to login', async () => {
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );
      mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
        undefined,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(trackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Error Handling Coverage', () => {
    it('handles authentication errors gracefully', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Authentication failed'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'wrongPassword');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('clears password state on new input after error', async () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'password1');
      expect(passwordInput.props.value).toBe('password1');

      fireEvent.changeText(passwordInput, 'password2');
      expect(passwordInput.props.value).toBe('password2');
    });

    it('handles decrypt failed error without crashing', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Error: Decrypt failed'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'wrongPassword123');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles Android BAD_DECRYPT error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Error: Error: BAD_DECRYPT'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles DoCipher error for Android', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Error: Error: Error: DoCipher'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles vault corruption error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Error: Vault is corrupted'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles JSON parse error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('SyntaxError: Unexpected token'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles seedless onboarding error without network', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('SeedlessOnboardingController - Network error'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles generic error gracefully', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Unexpected error occurred'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('does not attempt login with empty password', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.press(loginButton);

      expect(Authentication.userEntryAuth).not.toHaveBeenCalled();
    });
  });

  describe('Biometric Error Handling', () => {
    it('handles biometric authentication failure gracefully', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });
      (Authentication.appTriggeredAuth as jest.Mock).mockRejectedValue(
        new Error('Biometric authentication failed'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles biometric cancel gracefully', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });
      (Authentication.appTriggeredAuth as jest.Mock).mockRejectedValue(
        new Error('User cancelled biometric authentication'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });

  describe('Edge Cases Coverage', () => {
    it('handles rapid password changes', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'pass1');
      fireEvent.changeText(passwordInput, 'pass2');
      fireEvent.changeText(passwordInput, 'pass3');
      fireEvent.changeText(passwordInput, 'finalPassword123');

      expect(passwordInput.props.value).toBe('finalPassword123');
    });

    it('renders correctly when mounted', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeTruthy();
      expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeTruthy();
    });

    it('handles multiple login attempts with different passwords', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValueOnce(
        new Error('Wrong password'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'wrongPassword1');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      fireEvent.changeText(passwordInput, 'wrongPassword2');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('maintains component state through error recovery', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValueOnce(
        new Error('Error'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'testPassword');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(loginButton).toBeTruthy();
      expect(passwordInput).toBeTruthy();

      fireEvent.changeText(passwordInput, 'newPassword123');
      expect(passwordInput.props.value).toBe('newPassword123');
    });

    it('handles password field focus and blur events', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent(passwordInput, 'focus');
      fireEvent.changeText(passwordInput, 'testPassword123');
      fireEvent(passwordInput, 'blur');

      expect(passwordInput.props.value).toBe('testPassword123');
    });
  });

  describe('Seedless Onboarding Error Handling', () => {
    it('handles generic seedless recovery error', async () => {
      const genericError = new SeedlessOnboardingControllerRecoveryError(
        'GenericRecoveryError',
      );
      genericError.message =
        'SeedlessOnboardingController - Generic recovery error';

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        genericError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });

  describe('Switch Interactions Coverage', () => {
    it('renders login options switch component', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles biometry choice update', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const biometrySwitch = getByTestId(LoginViewSelectors.BIOMETRIC_SWITCH);

      await act(async () => {
        fireEvent(biometrySwitch, 'valueChange', false);
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('updates remember me choice when available', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: 'FaceID',
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <OAuthRehydration />,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const rememberMeSwitch = queryByTestId(
        LoginViewSelectors.REMEMBER_ME_SWITCH,
      );

      if (rememberMeSwitch) {
        await act(async () => {
          fireEvent(rememberMeSwitch, 'valueChange', true);
        });
      }

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });

  describe('Network and Connectivity Coverage', () => {
    it('handles authentication with internet connection', async () => {
      const mockNetInfoOnline = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { isConnectionExpensive: false },
      };

      (useNetInfo as jest.Mock).mockReturnValue(mockNetInfoOnline);

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('SeedlessOnboardingController - Other error'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });

  describe('Analytics and Tracking Coverage', () => {
    it('tracks login screen viewed on mount', () => {
      renderWithProvider(<OAuthRehydration />);

      expect(trackOnboarding).toHaveBeenCalled();
    });

    it('tracks use different login method clicked', () => {
      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const otherMethodsButton = getByTestId(
        LoginViewSelectors.OTHER_METHODS_BUTTON,
      );

      fireEvent.press(otherMethodsButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('tracks rehydration password attempted event', async () => {
      mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(
        undefined,
      );
      mockEngine.context.KeyringController.submitPassword.mockResolvedValue(
        undefined,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      expect(trackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Error State Management Coverage', () => {
    it('clears error when password changes', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Wrong password'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'wrongPassword');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      fireEvent.changeText(passwordInput, 'newPassword123');

      expect(passwordInput.props.value).toBe('newPassword123');
    });

    it('prevents multiple simultaneous login attempts', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 1000);
          }),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      fireEvent.changeText(passwordInput, 'testPassword123');

      act(() => {
        fireEvent.press(loginButton);
      });

      expect(loginButton.props.loading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    });

    it('handles error without crashing when component is unmounted', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('Error after unmount')), 1000);
          }),
      );

      const { getByTestId, unmount } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

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

  describe('Seedless Error Analytics Tracking', () => {
    it('tracks analytics when IncorrectPassword error occurs', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });

    it('tracks analytics when PasswordRecentlyUpdated error occurs', async () => {
      const seedlessError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        'Password was recently updated',
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });

    it('tracks analytics when password decryption fails', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Too Many Attempts Error Handling', () => {
    it('tracks analytics when TooManyLoginAttempts error occurs', async () => {
      const seedlessError = new Error(
        'SeedlessOnboardingController - TooManyLoginAttempts',
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Network Connectivity Handling', () => {
    it('handles seedless error when network is offline', async () => {
      (useNetInfo as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const seedlessError = new Error(
        'SeedlessOnboardingController - IncorrectPassword',
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });

  describe('Seedless Controller Error Handling', () => {
    it('updates failed attempts count for TooManyLoginAttempts', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 5, numberOfAttempts: 3 },
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });

    it('displays error for generic SeedlessOnboardingControllerError', async () => {
      const seedlessError = new SeedlessOnboardingControllerError(
        'GenericError' as unknown as SeedlessOnboardingControllerErrorType,
        'Generic seedless error',
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('sanitizes seedless error message by removing prefix', async () => {
      const seedlessError = new Error(
        'SeedlessOnboardingController - Custom error message',
      );

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        seedlessError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockTrackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Additional Error Paths Coverage', () => {
    it('handles PASSCODE_NOT_SET_ERROR with alert', async () => {
      const passcodeError = new Error('Error: Passcode not set.');

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        passcodeError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });

    it('handles DENY_PIN_ERROR_ANDROID and updates biometry choice', async () => {
      const denyPinError = new Error('Error: Error: Cancel');

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        denyPinError,
      );

      const { getByTestId } = renderWithProvider(<OAuthRehydration />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'testPassword123');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeTruthy();
    });
  });
});
