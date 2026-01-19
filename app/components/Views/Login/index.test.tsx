import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent, act } from '@testing-library/react-native';
import { LoginViewSelectors } from './LoginView.testIds';
import {
  InteractionManager,
  BackHandler,
  Alert,
  Image,
  Platform,
} from 'react-native';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
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

// Mock react-native Keyboard
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Keyboard: {
      dismiss: jest.fn(),
    },
  };
});

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
  checkIsSeedlessPasswordOutdated: jest.fn().mockResolvedValue(false),
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

// Mock animation components
jest.mock('../../UI/OnboardingAnimation/OnboardingAnimation');

jest.mock('../../UI/FoxAnimation/FoxAnimation');

jest.mock('../../../util/test/utils', () => ({
  ...jest.requireActual('../../../util/test/utils'),
  isE2E: false,
}));

// Mock Rive animations
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: () => null,
  Fit: { Contain: 'contain' },
  Alignment: { Center: 'center' },
}));

jest.mock('../../UI/ScreenshotDeterrent', () => ({
  ScreenshotDeterrent: () => null,
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: {
    setInputMode: jest.fn(),
    setDefaultMode: jest.fn(),
  },
  AndroidSoftInputModes: {
    SOFT_INPUT_ADJUST_NOTHING: 0,
    SOFT_INPUT_ADJUST_PAN: 1,
    SOFT_INPUT_ADJUST_RESIZE: 2,
    SOFT_INPUT_ADJUST_UNSPECIFIED: 3,
  },
}));

jest.mock('../../../util/validators', () => ({
  parseVaultValue: jest.fn(),
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  resetOauthState: jest.fn(),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () =>
  jest.fn(),
);

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
    (Component) => (props: Record<string, unknown>) => (
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

// Mock useNetInfo
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

const mockUseMetrics = jest.mocked(useMetrics);

const mockBackHandlerAddEventListener = jest.fn();
const mockBackHandlerRemoveEventListener = jest.fn();

describe('Login', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);
  const mockTrackOnboarding = jest.mocked(
    jest.requireMock('../../../util/metrics/TrackOnboarding/trackOnboarding'),
  );

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
    mockTrackOnboarding.mockClear();

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

  it('calls trace function for AuthenticateUser during non-OAuth login', async () => {
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
    it('shows forgot password modal when reset wallet pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<Login />);

      // Act
      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
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

      it('navigates to opt-in metrics when UI not seen and metrics disabled', async () => {
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

      it('navigates to home when UI not seen but metrics enabled', async () => {
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

      it('navigates to home when UI seen and metrics disabled', async () => {
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

      it('navigates to home when UI seen and metrics enabled', async () => {
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

    describe('checkMetricsUISeen navigation', () => {
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
      expect(passwordInput).toBeOnTheScreen();
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
      expect(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeOnTheScreen();
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
      mockTrackOnboarding.mockClear();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('displays invalid password error when decryption fails', async () => {
      // Arrange
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'password',
      });
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('Decrypt failed'),
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
      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeOnTheScreen();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('displays invalid password error for Android BAD_DECRYPT error', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'password',
      });
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
      expect(errorElement).toBeOnTheScreen();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('displays invalid password error for Android DoCipher error', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'password',
      });
      (Authentication.userEntryAuth as jest.Mock).mockRejectedValue(
        new Error('error in DoCipher, status: 2'),
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
      expect(errorElement).toBeOnTheScreen();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('displays invalid password error when password requirements not met', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'password',
        oauth2Login: true,
      });
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
      expect(errorElement).toBeOnTheScreen();
      expect(errorElement.props.children).toEqual(
        strings('login.invalid_password'),
      );
    });

    it('displays generic error message for unexpected errors', async () => {
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
      expect(errorElement).toBeOnTheScreen();
      expect(errorElement.props.children).toEqual(
        'Error: Some unexpected error',
      );
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

    it('displays alert when passcode not set', async () => {
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

    it('does not navigate when biometric authentication fails', async () => {
      // Arrange
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

      // Act
      await act(async () => {
        fireEvent.press(biometryButton);
      });

      // Assert
      expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
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

    it('locks app when back button is pressed', () => {
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
  });

  describe('Conditional Rendering Based on OAuth Status', () => {
    describe('Regular Login', () => {
      beforeEach(() => {
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: false,
          },
        });
      });

      it('renders static MetaMask logo and fox animation', () => {
        // Arrange & Act
        const { getByTestId, queryByTestId, UNSAFE_root } = renderWithProvider(
          <Login />,
        );

        // Assert - Fox animation is rendered
        expect(getByTestId('fox-animation-mock')).toBeDefined();

        // Assert - Regular login elements
        expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeDefined();

        // Assert - OAuth elements are hidden
        expect(queryByTestId(LoginViewSelectors.TITLE_ID)).toBeNull();
        expect(
          queryByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON),
        ).toBeNull();

        // Assert - metaMask logo is rendered
        const images = UNSAFE_root.findAllByType(Image);
        const hasMetaMaskLogo = images.some(
          (img) => img.props.source === METAMASK_NAME,
        );

        expect(hasMetaMaskLogo).toBe(true);
      });

      it('checks for seedless password status after 100ms delay', () => {
        // Arrange
        jest.useFakeTimers();
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

        // Act
        renderWithProvider(<Login />);

        // Assert
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

        setTimeoutSpy.mockRestore();
        jest.useRealTimers();
      });
    });

    describe('Common Elements', () => {
      it('renders core login elements', () => {
        mockRoute.mockReturnValue({
          params: {
            locked: false,
            oauthLoginSuccess: false,
          },
        });

        const { getByTestId } = renderWithProvider(<Login />);

        expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeDefined();
        expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeDefined();
        expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeDefined();
      });
    });
  });

  describe('KeyboardAwareScrollView Configuration', () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = Platform.OS;
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('sets extraScrollHeight to 50 on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });

      const { UNSAFE_root } = renderWithProvider(<Login />);

      const scrollView = UNSAFE_root.findByProps({ extraScrollHeight: 50 });
      expect(scrollView).toBeDefined();
      expect(scrollView.props.extraScrollHeight).toBe(50);
    });

    it('sets extraScrollHeight to 0 on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });

      const { UNSAFE_root } = renderWithProvider(<Login />);

      const scrollView = UNSAFE_root.findByProps({ extraScrollHeight: 0 });
      expect(scrollView).toBeDefined();
      expect(scrollView.props.extraScrollHeight).toBe(0);
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
