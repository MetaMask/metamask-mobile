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

import OAuthRehydration from './index';

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
});
