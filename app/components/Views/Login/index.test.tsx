import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent, act } from '@testing-library/react-native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { InteractionManager, BackHandler, Alert } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';
import { strings } from '../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { passwordRequirementsMet } from '../../../util/password';
import StorageWrapper from '../../../store/storage-wrapper';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { passcodeType } from '../../../util/authentication';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { IUseMetricsHook } from '../../hooks/useMetrics/useMetrics.types';
import {
  OPTIN_META_METRICS_UI_SEEN,
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
} from '../../../constants/storage';
import { useMetrics } from '../../hooks/useMetrics';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockRoute = jest.fn().mockReturnValue({
  params: {
    locked: false,
    oauthLoginSuccess: undefined,
  },
});

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

const mockSocialLoginUIChangesEnabled = jest.fn();
jest.mock('../../../util/onboarding', () => ({
  get SOCIAL_LOGIN_UI_CHANGES_ENABLED() {
    return mockSocialLoginUIChangesEnabled();
  },
}));

// Metrics mocks
const mockTrackEvent = jest.fn();

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

jest.mock('../../../util/trace', () => {
  const actualTrace = jest.requireActual('../../../util/trace');
  return {
    ...actualTrace,
    trace: jest.fn().mockImplementation((_request, callback) => {
      if (callback) {
        return callback();
      }
      return 'mockTraceContext';
    }),
    endTrace: jest.fn(),
  };
});

const mockMetricsTrackEvent = jest.fn();
const mockMetricsCreateEventBuilder = jest.fn((eventName) => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ name: eventName }),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    isEnabled: jest.fn(() => true),
  })),
  withMetricsAwareness: jest.fn(
    (Component) => (props: Record<string, unknown>) =>
      (
        <Component
          {...props}
          metrics={{
            trackEvent: mockMetricsTrackEvent,
            createEventBuilder: mockMetricsCreateEventBuilder,
          }}
        />
      ),
  ),
  MetaMetricsEvents: {
    ERROR_SCREEN_VIEWED: 'Error Screen Viewed',
  },
}));

const mockUseMetrics = jest.mocked(useMetrics);

const mockBackHandlerAddEventListener = jest.fn();
const mockBackHandlerRemoveEventListener = jest.fn();

describe('Login', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockMetricsTrackEvent.mockClear();
    mockMetricsCreateEventBuilder.mockClear();
    mockReplace.mockClear();
    mockGoBack.mockClear();
    mockReset.mockClear();
    mockRoute.mockClear();
    mockTrace.mockClear();
    mockEndTrace.mockClear();
    mockBackHandlerAddEventListener.mockClear();
    mockBackHandlerRemoveEventListener.mockClear();

    BackHandler.addEventListener = mockBackHandlerAddEventListener;
    BackHandler.removeEventListener = mockBackHandlerRemoveEventListener;

    mockUseMetrics.mockReturnValue({
      isEnabled: jest.fn(() => true),
    } as unknown as IUseMetricsHook);
    (Authentication.rehydrateSeedPhrase as jest.Mock).mockResolvedValue(true);
    (Authentication.userEntryAuth as jest.Mock).mockResolvedValue(true);
    (passwordRequirementsMet as jest.Mock).mockReturnValue(true);
    (Authentication.componentAuthenticationType as jest.Mock).mockResolvedValue(
      {
        currentAuthType: 'password',
      },
    );
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: 'password',
      availableBiometryType: null,
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    mockUseMetrics.mockReturnValue({
      isEnabled: jest.fn(() => false),
      trackEvent: mockTrackEvent,
    } as unknown as IUseMetricsHook);
    mockBackHandlerAddEventListener.mockClear();
    mockBackHandlerRemoveEventListener.mockClear();

    BackHandler.addEventListener = mockBackHandlerAddEventListener;
    BackHandler.removeEventListener = mockBackHandlerRemoveEventListener;
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

  it('should call trace function for AuthenticateUser during non-OAuth login', async () => {
    (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
      if (key === OPTIN_META_METRICS_UI_SEEN) return true;
      return null;
    });

    const { getByTestId } = renderWithProvider(<Login />);
    const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

    await act(async () => {
      fireEvent.changeText(passwordInput, 'valid-password123');
    });
    await act(async () => {
      fireEvent(passwordInput, 'submitEditing');
    });

    expect(mockTrace).toHaveBeenCalledTimes(2);
    expect(mockTrace).toHaveBeenNthCalledWith(1, {
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    expect(mockTrace).toHaveBeenNthCalledWith(
      2,
      {
        name: TraceName.AuthenticateUser,
        op: TraceOperation.Login,
      },
      expect.any(Function),
    );
    expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
  });

  describe('Forgot Password', () => {
    it('show the forgot password modal', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeTruthy();
      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
        params: {
          oauthLoginSuccess: false,
        },
      });
    });

    describe('checkMetricsUISeen', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: false,
          },
        });
      });

      it('should navigate to opt-in metrics when UI not seen and metrics disabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN) return Promise.resolve(null);
          return Promise.resolve(null);
        });

        mockUseMetrics.mockReturnValue({
          isEnabled: jest.fn(() => false),
          trackEvent: mockTrackEvent,
        } as unknown as IUseMetricsHook);

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
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
      });

      it('should navigate to home when UI not seen but metrics enabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN) return Promise.resolve(null);
          return Promise.resolve(null);
        });

        mockUseMetrics.mockReturnValue({
          isEnabled: jest.fn(() => true),
          trackEvent: mockTrackEvent,
        } as unknown as IUseMetricsHook);

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });

      it('should navigate to home when UI seen and metrics disabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN)
            return Promise.resolve('true');
          return Promise.resolve(null);
        });

        mockUseMetrics.mockReturnValue({
          isEnabled: jest.fn(() => false),
          trackEvent: mockTrackEvent,
        } as unknown as IUseMetricsHook);

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });

      it('should navigate to home when UI seen and metrics enabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN)
            return Promise.resolve('true');
          return Promise.resolve(null);
        });

        mockUseMetrics.mockReturnValue({
          isEnabled: jest.fn(() => true),
          trackEvent: mockTrackEvent,
        } as unknown as IUseMetricsHook);

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });
    });

    describe('checkMetricsUISeen', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: false,
          },
        });
      });

      it('navigate to opt-in metrics when UI not seen and metrics disabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN) return Promise.resolve(null);
          return Promise.resolve(null);
        });

        (useMetrics as jest.Mock).mockReturnValue({
          isEnabled: () => false,
        });

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
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
      });

      it('navigate to home when UI not seen but metrics enabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN) return Promise.resolve(null);
          return Promise.resolve(null);
        });

        (useMetrics as jest.Mock).mockReturnValue({
          isEnabled: () => true,
        });

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });

      it('navigate to home when UI seen and metrics disabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN)
            return Promise.resolve('true');
          return Promise.resolve(null);
        });

        (useMetrics as jest.Mock).mockReturnValue({
          isEnabled: () => false,
        });

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
      });

      it('navigate to home when UI seen and metrics enabled', async () => {
        // Arrange
        (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
          if (key === OPTIN_META_METRICS_UI_SEEN)
            return Promise.resolve('true');
          return Promise.resolve(null);
        });

        (useMetrics as jest.Mock).mockReturnValue({
          isEnabled: () => true,
        });

        (Authentication.userEntryAuth as jest.Mock).mockResolvedValueOnce(
          undefined,
        );
        (
          Authentication.componentAuthenticationType as jest.Mock
        ).mockResolvedValueOnce({
          currentAuthType: 'password',
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

        // Act
        await act(async () => {
          fireEvent.changeText(passwordInput, 'validPassword123');
        });

        await act(async () => {
          fireEvent.press(loginButton);
        });

        // Wait for async operations to complete
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
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
    it('set up remember me authentication when auth type is REMEMBER_ME', async () => {
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

  describe('Password Error Handling', () => {
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

    it('should handle WRONG_PASSWORD_ERROR', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle WRONG_PASSWORD_ERROR_ANDROID', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error(
          'error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
        ),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle PASSWORD_REQUIREMENTS_NOT_MET error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Password requirements not met'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle generic error (else case)', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Some unexpected error'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Error: Some unexpected error',
      );
    });
  });

  describe('Passcode Authentication', () => {
    beforeEach(() => {
      (StorageWrapper.getItem as jest.Mock).mockReset();
    });

    it('set up passcode authentication when auth type is PASSCODE', async () => {
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

  describe('Biometric Authentication Setup', () => {
    beforeEach(() => {
      (StorageWrapper.getItem as jest.Mock).mockReset();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
    });

    it('biometric authentication is setup when availableBiometryType is present', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });

      const { getByTestId } = renderWithProvider(<Login />);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should render biometric button when biometric is available
      expect(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeTruthy();
    });

    it('biometric button is not shown when device is locked', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: true,
          oauthLoginSuccess: false,
        },
      });

      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });

      const { queryByTestId } = renderWithProvider(<Login />);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should NOT render biometric button when device is locked
      expect(queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeNull();
    });

    it('biometric button is not shown when previously disabled', async () => {
      (StorageWrapper.getItem as jest.Mock).mockImplementation((key) => {
        if (key === BIOMETRY_CHOICE_DISABLED) return Promise.resolve(TRUE);
        return Promise.resolve(null);
      });

      (Authentication.getType as jest.Mock).mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: 'TouchID',
      });

      const { queryByTestId } = renderWithProvider(<Login />);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should NOT render biometric button when previously disabled
      expect(queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeNull();
    });
  });

  describe('Password Error Handling', () => {
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

    it('should handle WRONG_PASSWORD_ERROR', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle WRONG_PASSWORD_ERROR_ANDROID', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error(
          'error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
        ),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle PASSWORD_REQUIREMENTS_NOT_MET error', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Password requirements not met'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('should handle generic error (else case)', async () => {
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Some unexpected error'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Error: Some unexpected error',
      );
    });

    it('should handle OnboardingPasswordLoginError trace during onboarding flow', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
          onboardingTraceCtx: 'mockTraceContext',
        },
      });

      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Some unexpected error'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Error: Some unexpected error',
      );

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordLoginError,
        op: TraceOperation.OnboardingError,
        tags: { errorMessage: 'Error: Some unexpected error' },
        parentContext: 'mockTraceContext',
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordLoginError,
      });
    });
  });

  describe('Passcode Error Handling', () => {
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

    it('should handle PASSCODE_NOT_SET_ERROR with alert', async () => {
      const mockAlert = jest
        .spyOn(Alert, 'alert')
        .mockImplementation(() => undefined);
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Passcode not set.'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockAlert).toHaveBeenCalledWith(
        strings('login.security_alert_title'),
        strings('login.security_alert_desc'),
      );

      mockAlert.mockRestore();
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
      (passcodeType as jest.Mock).mockReturnValue('TouchID');
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });
      (StorageWrapper.getItem as jest.Mock).mockReset();
    });

    afterEach(() => {
      mockSocialLoginUIChangesEnabled.mockReset();
      jest.clearAllMocks();
    });

    it('successfully authenticate with biometrics and navigate to home', async () => {
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (StorageWrapper.getItem as jest.Mock).mockReturnValueOnce(null);
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
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
    });

    it('successfully authenticate with biometrics When mockSocialLoginUIChanges flag is enabled and navigate to home', async () => {
      mockSocialLoginUIChangesEnabled.mockReturnValue(true);
      (Authentication.appTriggeredAuth as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (StorageWrapper.getItem as jest.Mock).mockReturnValueOnce(null);
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
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
    });

    it('handle biometric authentication failure', async () => {
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(biometryButton).toBeTruthy();
    });
  });

  describe('handleBackPress', () => {
    it('registers and deregisters back handler on mount and unmount', () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });

      const { unmount } = renderWithProvider(<Login />);
      unmount();

      expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
      expect(mockBackHandlerRemoveEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('handleBackPress locks app when oauthLoginSuccess is false', () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });

      renderWithProvider(<Login />);

      const handleBackPress = mockBackHandlerAddEventListener.mock.calls[0][1];
      const result = handleBackPress();

      expect(Authentication.lockApp).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('handleBackPress navigates back when oauthLoginSuccess is true', () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });

      renderWithProvider(<Login />);

      const handleBackPress = mockBackHandlerAddEventListener.mock.calls[0][1];
      const result = handleBackPress();

      expect(mockGoBack).toHaveBeenCalled();
      expect(Authentication.lockApp).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
// it('should navigate back and reset OAuth state when using other methods', async () => {
//   mockRoute.mockReturnValue({
//     params: {
//       locked: false,
//       oauthLoginSuccess: true,
//     },
//   });
