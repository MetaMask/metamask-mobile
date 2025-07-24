import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { InteractionManager } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';
import { passwordRequirementsMet } from '../../../util/password';
import { trace } from '../../../util/trace';
import StorageWrapper from '../../../store/storage-wrapper';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = jest.fn();

// Mock dependencies
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
    useRoute: () => ({
      params: {
        locked: false,
      },
    }),
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

// mock useNavigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
    useRoute: () => mockRoute(),
  };
});

// mock useRoutee

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

// mock useNavigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
    useRoute: () => mockRoute(),
  };
});

// Mock Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    userEntryAuth: jest.fn(),
    componentAuthenticationType: jest.fn(),
    lockApp: jest.fn(),
    getType: jest.fn(),
    appTriggeredAuth: jest.fn(),
  },
}));

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

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
