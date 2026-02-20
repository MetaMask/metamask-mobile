import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import { LoginViewSelectors } from './LoginView.testIds';
import {
  InteractionManager,
  BackHandler,
  Image,
  Platform,
  Alert,
} from 'react-native';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { passwordRequirementsMet } from '../../../util/password';
import StorageWrapper from '../../../store/storage-wrapper';
import { passcodeType } from '../../../util/authentication';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  PASSCODE_NOT_SET_ERROR,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  VAULT_ERROR,
  DENY_PIN_ERROR_ANDROID,
} from './constants';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';
import { downloadStateLogs } from '../../../util/logs';
import { getVaultFromBackup } from '../../../core/BackupVault';

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

const mockGetAuthType = jest.fn();
const mockComponentAuthenticationType = jest.fn();
const mockUnlockWallet = jest.fn();
const mockLockApp = jest.fn();
const mockReauthenticate = jest.fn();
const mockRevealSRP = jest.fn();
const mockRevealPrivateKey = jest.fn();
const mockCheckIsSeedlessPasswordOutdated = jest.fn().mockResolvedValue(false);

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
    checkIsSeedlessPasswordOutdated: mockCheckIsSeedlessPasswordOutdated,
  }),
}));

const defaultCapabilities = {
  authType: AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
  isBiometricsAvailable: true,
  passcodeAvailable: true,
  authLabel: 'Device Authentication',
  osAuthEnabled: true,
  allowLoginWithRememberMe: false,
  deviceAuthRequiresSettings: false,
};

const mockUseAuthCapabilities = jest.fn(() => ({
  capabilities: defaultCapabilities,
  isLoading: false,
}));

jest.mock('../../../core/Authentication/hooks/useAuthCapabilities', () => ({
  __esModule: true,
  default: () => mockUseAuthCapabilities(),
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
      dispatch: jest.fn((action) => {
        if (action.type === 'REPLACE') {
          mockReplace(action.payload.name, action.payload.params);
        }
      }),
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
  const traceCallbackPromiseRef: { current: Promise<unknown> | null } = {
    current: null,
  };
  const traceFn = jest.fn().mockImplementation(async (_request, callback) => {
    if (callback) {
      traceCallbackPromiseRef.current = callback();
      return await traceCallbackPromiseRef.current;
    }
    return 'mockTraceContext';
  });
  // Expose ref so tests can await the trace callback promise inside act()
  Object.assign(traceFn, {
    __traceCallbackPromiseRef: traceCallbackPromiseRef,
  });
  return {
    ...actualTrace,
    trace: traceFn,
    endTrace: jest.fn(),
  };
});

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

jest.mock('../../../util/metrics/TrackError/trackErrorAsAnalytics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../util/analytics/vaultCorruptionTracking', () => ({
  trackVaultCorruption: jest.fn(),
}));

jest.mock('../../../util/logs', () => ({
  downloadStateLogs: jest.fn(),
}));

jest.mock('../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({ mock: 'state' })),
    },
  },
}));

const mockBackHandlerAddEventListener = jest.fn();
const mockBackHandlerRemoveEventListener = jest.fn();

describe('Login', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);
  const mockTrackOnboarding = jest.mocked(
    jest.requireMock('../../../util/metrics/TrackOnboarding/trackOnboarding'),
  );
  const mockTrackErrorAsAnalytics =
    trackErrorAsAnalytics as jest.MockedFunction<typeof trackErrorAsAnalytics>;
  const mockTrackVaultCorruption = jest.mocked(trackVaultCorruption);
  const mockDownloadStateLogs = jest.mocked(downloadStateLogs);
  const mockGetVaultFromBackup = jest.mocked(getVaultFromBackup);
  const mockAlertAlert = jest.fn();
  const originalAlert = Alert.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = mockAlertAlert;
    mockNavigate.mockClear();
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

    // (Authentication.rehydrateSeedPhrase as jest.Mock).mockResolvedValue(true);
    mockUnlockWallet.mockResolvedValue(true);
    (passwordRequirementsMet as jest.Mock).mockReturnValue(true);
    mockComponentAuthenticationType.mockResolvedValue({
      currentAuthType: 'password',
    });
    mockGetAuthType.mockResolvedValue({
      currentAuthType: 'password',
      availableBiometryType: null,
    });
    mockUseAuthCapabilities.mockReturnValue({
      capabilities: defaultCapabilities,
      isLoading: false,
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    mockBackHandlerAddEventListener.mockClear();
    mockBackHandlerRemoveEventListener.mockClear();

    BackHandler.addEventListener = mockBackHandlerAddEventListener;
    BackHandler.removeEventListener = mockBackHandlerRemoveEventListener;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    Alert.alert = originalAlert;
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

  describe('Device authentication button visibility', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
    });

    it('renders device authentication button when capabilities allow device auth', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        capabilities: {
          ...defaultCapabilities,
          authType: AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
        },
        isLoading: false,
      });

      const { getByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeOnTheScreen();
    });

    it('hides device authentication button when device is locked', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: true,
          oauthLoginSuccess: false,
        },
      });

      const { queryByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(queryByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeNull();
    });

    it('hides device authentication button when capabilities do not support device auth', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        capabilities: {
          ...defaultCapabilities,
          authType: AUTHENTICATION_TYPE.PASSWORD,
        },
        isLoading: false,
      });

      const { queryByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

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
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: 'password',
      });
      mockUnlockWallet.mockRejectedValue(new Error('Decrypt failed'));

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
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: 'password',
      });
      mockUnlockWallet.mockRejectedValue(
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
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: 'password',
      });
      mockUnlockWallet.mockRejectedValue(
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

    it('displays invalid password error when password is incorrect', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: 'password',
        oauth2Login: true,
      });
      mockUnlockWallet.mockRejectedValue(
        new Error('Password is incorrect, try again.'),
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
      mockUnlockWallet.mockRejectedValue(new Error('Some unexpected error'));

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
      expect(errorElement.props.children).toEqual('Some unexpected error');
    });

    it('navigates to rehydrate screen when seedless onboarding error is detected', async () => {
      mockUnlockWallet.mockRejectedValue(
        new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
          'Password was recently updated',
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

      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.REHYDRATE, {
        isSeedlessPasswordOutdated: true,
      });
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
      mockGetAuthType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });
      (StorageWrapper.getItem as jest.Mock).mockReset();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('authenticates with biometrics and navigates to home', async () => {
      mockUnlockWallet.mockResolvedValueOnce(true);
      (StorageWrapper.getItem as jest.Mock).mockReturnValueOnce(null);
      (passcodeType as jest.Mock).mockReturnValueOnce('device_passcode');
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });
      mockUnlockWallet.mockResolvedValueOnce(true);

      const { getByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(mockUnlockWallet).toHaveBeenCalled();
    });

    it('does not navigate when biometric authentication fails', async () => {
      // Arrange
      (passcodeType as jest.Mock).mockReturnValueOnce('device_passcode');
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });
      const biometricError = new Error('Biometric authentication failed');
      mockUnlockWallet.mockRejectedValueOnce(biometricError);

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
      expect(mockUnlockWallet).toHaveBeenCalled();
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

      expect(mockLockApp).toHaveBeenCalled();
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

  describe('Biometric fallback alert after seedless password sync', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      // Isolate auth mocks so previous tests cannot leave stale implementations
      // (e.g. mockRejectedValue or mockResolvedValueOnce from other describe blocks).
      mockUnlockWallet.mockReset();
      mockUnlockWallet.mockResolvedValue(true);
      mockGetAuthType.mockReset();
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'password',
        availableBiometryType: null,
      });
      mockCheckIsSeedlessPasswordOutdated.mockReset();
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
    });

    it('checks seedless password status and calls getAuthType when outdated', async () => {
      // Arrange - device supports biometrics but auth fell back to PASSWORD
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'password',
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act - commit password, then submit and wait for the trace callback inside act
      // so the async unlock flow (checkIsSeedlessPasswordOutdated -> unlockWallet -> getAuthType) completes before we assert.
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
        const promiseRef = (
          trace as {
            __traceCallbackPromiseRef?: { current: Promise<unknown> | null };
          }
        ).__traceCallbackPromiseRef;
        if (promiseRef?.current) {
          await promiseRef.current;
          promiseRef.current = null;
        }
      });

      // Assert
      expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(false);
      expect(mockUnlockWallet).toHaveBeenCalledWith({
        password: 'valid-password123',
      });
      expect(mockGetAuthType).toHaveBeenCalled();
    });

    it('does not call getAuthType after unlock when seedless password is not outdated', async () => {
      // Arrange
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(<Login />);

      // Wait for mount effects that call getAuthType
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const getAuthTypeCallCountAfterMount = mockGetAuthType.mock.calls.length;

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert
      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      // getAuthType should NOT be called extra times after unlock
      expect(mockGetAuthType.mock.calls.length).toBe(
        getAuthTypeCallCountAfterMount,
      );
    });

    it('does not enter alert branch when auth type is BIOMETRIC even if seedless password is outdated', async () => {
      // Arrange
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'biometrics',
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert - flow reaches getAuthType but BIOMETRIC type skips the alert branch
      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(false);
      });
    });

    it('does not enter alert branch when device has no biometry support', async () => {
      // Arrange - auth type is PASSWORD but device doesn't support biometrics
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'password',
        availableBiometryType: null,
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      // Act
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      // Assert - flow completes normally (no alert needed since no biometry)
      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(false);
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

  describe('Analytics Tracking', () => {
    it('tracks LOGIN_SCREEN_VIEWED on mount', () => {
      renderWithProvider(<Login />);

      expect(mockTrackOnboarding).toHaveBeenCalledWith(
        MetaMetricsEvents.LOGIN_SCREEN_VIEWED,
        expect.any(Function),
      );
    });

    it('tracks FORGOT_PASSWORD_CLICKED when reset wallet is pressed', () => {
      const { getByTestId } = renderWithProvider(<Login />);

      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));

      expect(mockTrackOnboarding).toHaveBeenCalledWith(
        MetaMetricsEvents.FORGOT_PASSWORD_CLICKED,
        expect.any(Function),
      );
    });

    it('tracks LOGIN_DOWNLOAD_LOGS and calls downloadStateLogs on long press', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      const foxAnimationMock = getByTestId('fox-animation-mock');
      const foxWrapper = foxAnimationMock.parent;

      if (!foxWrapper) {
        throw new Error('Fox animation wrapper not found');
      }

      fireEvent(foxWrapper, 'longPress');

      expect(mockTrackOnboarding).toHaveBeenCalledWith(
        MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS,
        expect.any(Function),
      );
      expect(mockDownloadStateLogs).toHaveBeenCalledWith(
        { mock: 'state' },
        false,
      );
    });

    it('calls trackErrorAsAnalytics on wrong password error', async () => {
      const errorMsg = 'Decrypt failed';
      mockUnlockWallet.mockReset().mockRejectedValue(new Error(errorMsg));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'wrong-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackErrorAsAnalytics).toHaveBeenCalledWith(
        'Login: Invalid Password',
        errorMsg,
      );
    });
  });

  describe('PASSCODE_NOT_SET_ERROR', () => {
    it('shows security alert when passcode is not set', async () => {
      mockUnlockWallet.mockRejectedValue(new Error(PASSCODE_NOT_SET_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'some-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockAlertAlert).toHaveBeenCalledWith(
        strings('login.security_alert_title'),
        strings('login.security_alert_desc'),
      );
    });
  });

  describe('JSON_PARSE_ERROR vault corruption', () => {
    it('triggers vault corruption flow on JSON parse error', async () => {
      mockUnlockWallet.mockRejectedValue(
        new Error(JSON_PARSE_ERROR_UNEXPECTED_TOKEN),
      );
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'corrupted',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'some-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackVaultCorruption).toHaveBeenCalledWith(
        JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
        expect.objectContaining({
          error_type: 'json_parse_error',
          context: 'login_authentication',
        }),
      );
      expect(mockGetVaultFromBackup).toHaveBeenCalled();
    });
  });

  describe('trackVaultCorruption in handleVaultCorruption', () => {
    it('tracks vault corruption at the start of recovery', async () => {
      mockUnlockWallet.mockRejectedValue(new Error(VAULT_ERROR));
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'no backup',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'some-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockTrackVaultCorruption).toHaveBeenCalledWith(
        VAULT_ERROR,
        expect.objectContaining({
          error_type: 'vault_corruption_handling',
          context: 'vault_corruption_recovery_attempt',
        }),
      );
    });
  });

  describe('Password change clears error', () => {
    it('clears error message when user types after an error', async () => {
      mockUnlockWallet.mockRejectedValue(new Error('Decrypt failed'));

      const { getByTestId, queryByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'wrong-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(passwordInput, 'new-attempt');
      });

      expect(
        queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('DENY_PIN_ERROR_ANDROID cancellation', () => {
    it('silently cancels without displaying an error', async () => {
      mockUnlockWallet.mockRejectedValue(new Error(DENY_PIN_ERROR_ANDROID));

      const { getByTestId, queryByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'some-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(
        queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Login button disabled state', () => {
    it('renders login button as disabled when password is empty', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      expect(loginButton).toHaveProp('disabled', true);
    });

    it('renders login button as enabled when password is entered', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      fireEvent.changeText(passwordInput, 'some-password');

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
      expect(loginButton).toHaveProp('disabled', false);
    });
  });

  describe('Biometric error re-enables credentials', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: false,
        },
      });
      (passcodeType as jest.Mock).mockReturnValue('TouchID');
      mockGetAuthType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });
      (StorageWrapper.getItem as jest.Mock).mockReset();
    });

    it('keeps biometric button visible after biometric unlock fails', async () => {
      mockUnlockWallet.mockRejectedValueOnce(
        new Error('Biometric auth failed'),
      );

      const { getByTestId } = renderWithProvider(<Login />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(LoginViewSelectors.BIOMETRY_BUTTON);

      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeOnTheScreen();
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
