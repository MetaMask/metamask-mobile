import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent, act, waitFor, screen } from '@testing-library/react-native';
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
import { parseVaultValue } from '../../../util/validators';
import { AuthCapabilities } from '../../../core/Authentication/types';
import { IconName } from '@metamask/design-system-react-native';
import Logger from '../../../util/Logger';
import { UNLOCK_WALLET_ERROR_MESSAGES } from '../../../core/Authentication/constants';
import ReduxService from '../../../core/redux/ReduxService';
import { RecursivePartial } from '../../../core/Authentication/Authentication.test';
import { RootState } from '../../../reducers';
import { ReduxStore } from '../../../core/redux/types';

// ─── Mock variables ──────────────────────────────────────────────────────────

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
const mockUpdateAuthPreference = jest.fn();

jest.mock('../../../util/Logger');
const mockLogger = Logger as jest.Mocked<typeof Logger>;

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
    updateAuthPreference: mockUpdateAuthPreference,
  }),
}));

const defaultCapabilities: AuthCapabilities = {
  authType: AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
  isBiometricsAvailable: true,
  passcodeAvailable: true,
  authLabel: 'Face ID',
  authDescription:
    "Use your device's biometrics or passcode to unlock MetaMask.",
  authIcon: IconName.Lock,
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

jest.mock('../../../util/password', () => ({
  passwordRequirementsMet: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Keyboard: {
      dismiss: jest.fn(),
    },
  };
});

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue(null),
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

jest.mock('../../UI/OnboardingAnimation/OnboardingAnimation');
jest.mock('../../UI/FoxAnimation/FoxAnimation');

// Mock FadeOutOverlay to prevent animation state updates after unmount (React 19)
jest.mock('../../UI/FadeOutOverlay', () => () => null);

jest.mock('../../../util/test/utils', () => ({
  ...jest.requireActual('../../../util/test/utils'),
  isE2E: false,
}));

jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: () => null,
  Fit: { Contain: 'contain' },
  Alignment: { Center: 'center' },
}));

jest.mock('../../UI/ScreenshotDeterrent', () => ({
  ScreenshotDeterrent: () => null,
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
  Object.assign(traceFn, {
    __traceCallbackPromiseRef: traceCallbackPromiseRef,
  });
  return {
    ...actualTrace,
    trace: traceFn,
    endTrace: jest.fn(),
  };
});

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

const mockBackHandlerAddEventListener = jest
  .fn()
  .mockReturnValue({ remove: jest.fn() });
const mockBackHandlerRemoveEventListener = jest.fn();

const createMockReduxStore = (stateOverrides?: RecursivePartial<RootState>) => {
  const defaultState = {
    user: { existingUser: false },
    security: { allowLoginWithRememberMe: false },
    settings: { lockTime: -1 },
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
  const mockParseVaultValue = jest.mocked(parseVaultValue);
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
    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    mockBackHandlerAddEventListener.mockClear();
    mockBackHandlerAddEventListener.mockReturnValue({ remove: jest.fn() });
    mockBackHandlerRemoveEventListener.mockClear();

    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    Alert.alert = originalAlert;
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  it('renders matching snapshot', () => {
    renderWithProvider(<Login />);
    expect(
      screen.getByTestId(LoginViewSelectors.PASSWORD_INPUT),
    ).toBeOnTheScreen();
  });

  it('renders matching snapshot when password input is focused', () => {
    const { getByTestId } = renderWithProvider(<Login />);
    fireEvent.changeText(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT),
      'password',
    );
    expect(
      screen.getByTestId(LoginViewSelectors.PASSWORD_INPUT),
    ).toBeOnTheScreen();
  });

  describe('Rendering', () => {
    it('renders core login elements', () => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      const { getByTestId } = renderWithProvider(<Login />);
      expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeOnTheScreen();
    });

    it('renders MetaMask logo and fox animation', () => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      const { getByTestId, queryByTestId, UNSAFE_root } = renderWithProvider(
        <Login />,
      );
      expect(getByTestId('fox-animation-mock')).toBeOnTheScreen();
      expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeOnTheScreen();
      expect(queryByTestId(LoginViewSelectors.TITLE_ID)).not.toBeOnTheScreen();
      expect(
        queryByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON),
      ).not.toBeOnTheScreen();
      const images = UNSAFE_root.findAllByType(Image);
      const hasMetaMaskLogo = images.some(
        (img) => img.props.source === METAMASK_NAME,
      );
      expect(hasMetaMaskLogo).toBe(true);
    });

    it('disables login button when password is empty', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeDisabled();
    });

    it('enables login button when password is entered', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      fireEvent.changeText(
        getByTestId(LoginViewSelectors.PASSWORD_INPUT),
        'some-password',
      );
      expect(
        getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID),
      ).not.toBeDisabled();
    });
  });

  describe('Device authentication', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
    });

    it('shows button when capabilities allow DEVICE_AUTHENTICATION', async () => {
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
      expect(
        getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
      ).toBeOnTheScreen();
    });

    it('shows button when capabilities allow BIOMETRIC', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        capabilities: {
          ...defaultCapabilities,
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
        },
        isLoading: false,
      });
      const { getByTestId } = renderWithProvider(<Login />);
      await waitFor(() => {
        expect(
          getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
        ).toBeOnTheScreen();
      });
    });

    it('hides button when device is locked', async () => {
      mockRoute.mockReturnValue({
        params: { locked: true, oauthLoginSuccess: false },
      });
      const { queryByTestId } = renderWithProvider(<Login />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(
        queryByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
      ).toBeNull();
    });

    it('hides button when capabilities do not support device auth', async () => {
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
      expect(
        queryByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
      ).toBeNull();
    });
  });

  describe('Password error handling', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
    });

    it.each([
      ['Decrypt failed', 'generic decryption failure'],
      [
        'error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
        'Android BAD_DECRYPT',
      ],
      ['error in DoCipher, status: 2', 'Android DoCipher'],
      ['Password is incorrect, try again.', 'incorrect password'],
    ])('displays invalid password error for %s', async (errorMessage) => {
      mockUnlockWallet.mockRejectedValueOnce(new Error(errorMessage));
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
      mockUnlockWallet.mockRejectedValueOnce(
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

      const biometryButton = getByTestId(
        LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
      );

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

      const biometryButton = getByTestId(
        LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
      );

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

      const mockRemove = jest.fn();
      mockBackHandlerAddEventListener.mockReturnValue({ remove: mockRemove });

      const { unmount } = renderWithProvider(<Login />);
      unmount();

      expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
      expect(mockRemove).toHaveBeenCalled();
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
      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(passwordInput, 'new-attempt');
      });
      expect(
        queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Vault corruption recovery', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      });
    });

    it('navigates to restore wallet on valid vault backup', async () => {
      jest.useRealTimers();
      try {
        mockGetVaultFromBackup.mockResolvedValueOnce({
          success: true,
          vault: 'mock-vault',
        });
        mockParseVaultValue.mockResolvedValueOnce('mock-seed');
        mockUnlockWallet.mockRejectedValueOnce(new Error(VAULT_ERROR));
        mockComponentAuthenticationType.mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        });

        const { getByTestId } = renderWithProvider(<Login />);
        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

        fireEvent.changeText(passwordInput, 'valid-password123');
        fireEvent(passwordInput, 'submitEditing');

        await waitFor(
          () => {
            expect(mockReplace).toHaveBeenCalledWith(
              Routes.VAULT_RECOVERY.RESTORE_WALLET,
              expect.objectContaining({
                params: {
                  previousScreen: Routes.ONBOARDING.LOGIN,
                },
                screen: Routes.VAULT_RECOVERY.RESTORE_WALLET,
              }),
            );
          },
          { timeout: 10000, interval: 100 },
        );
      } finally {
        jest.useFakeTimers();
      }
    }, 15000);

    it('shows error when vault seed cannot be parsed', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce(undefined);
      mockUnlockWallet.mockRejectedValueOnce(new Error(VAULT_ERROR));

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

    it('shows error when password requirements are not met', async () => {
      mockUnlockWallet.mockRejectedValueOnce(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, '123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('shows error when backup has error', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'Backup error',
      });
      mockUnlockWallet.mockRejectedValueOnce(new Error(VAULT_ERROR));

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

    it('triggers vault corruption flow on JSON parse error', async () => {
      mockUnlockWallet.mockRejectedValueOnce(
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

    it('tracks vault corruption analytics at start of recovery', async () => {
      mockUnlockWallet.mockRejectedValueOnce(new Error(VAULT_ERROR));
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

  describe('Biometric authentication', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      (passcodeType as jest.Mock).mockReturnValue('TouchID');
      mockGetAuthType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'TouchID',
      });
      (StorageWrapper.getItem as jest.Mock).mockReset();

      mockUnlockWallet.mockReset();
      mockUnlockWallet.mockResolvedValue(true);
    });

    it('authenticates with biometrics successfully', async () => {
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

      const biometryButton = getByTestId(
        LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
      );
      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(mockUnlockWallet).toHaveBeenCalled();
    });

    it('does not navigate when biometric auth fails', async () => {
      (passcodeType as jest.Mock).mockReturnValueOnce('device_passcode');
      mockGetAuthType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'TouchID',
      });
      mockUnlockWallet.mockRejectedValueOnce(
        new Error('Biometric authentication failed'),
      );

      const { getByTestId } = renderWithProvider(<Login />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const biometryButton = getByTestId(
        LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
      );
      await act(async () => {
        fireEvent.press(biometryButton);
      });

      expect(mockUnlockWallet).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('keeps biometric button visible after failure', async () => {
      jest.useRealTimers();
      try {
        mockUnlockWallet.mockRejectedValueOnce(
          new Error('Biometric auth failed'),
        );

        const { getByTestId } = renderWithProvider(<Login />);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        const biometryButton = getByTestId(
          LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
        );
        await act(async () => {
          fireEvent.press(biometryButton);
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(
          getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
        ).toBeOnTheScreen();
      } finally {
        jest.useFakeTimers();
      }
    });

    it('does not show error UI for Android keychain biometric user cancel', async () => {
      jest.useRealTimers();
      try {
        mockUnlockWallet.mockRejectedValueOnce(
          new Error('code: 10, msg: Fingerprint operation canceled by user'),
        );

        const { getByTestId, queryByTestId } = renderWithProvider(<Login />);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });
        mockLogger.error.mockClear();

        const biometryButton = getByTestId(
          LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
        );
        await act(async () => {
          fireEvent.press(biometryButton);
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(
          queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
        ).not.toBeOnTheScreen();
        expect(mockLogger.error).not.toHaveBeenCalled();
      } finally {
        jest.useFakeTimers();
      }
    });

    it('does not show error UI for iOS biometric user cancel', async () => {
      jest.useRealTimers();
      try {
        mockUnlockWallet.mockRejectedValueOnce(
          new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
        );

        const { getByTestId, queryByTestId } = renderWithProvider(<Login />);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });
        mockLogger.error.mockClear();

        const biometryButton = getByTestId(
          LoginViewSelectors.DEVICE_AUTHENTICATION_ICON,
        );
        await act(async () => {
          fireEvent.press(biometryButton);
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(
          queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
        ).not.toBeOnTheScreen();
        expect(mockLogger.error).not.toHaveBeenCalled();
      } finally {
        jest.useFakeTimers();
      }
    });

    it('silently cancels DENY_PIN_ERROR_ANDROID without error UI', async () => {
      jest.useRealTimers();
      try {
        mockGetAuthType.mockReset();
        mockGetAuthType.mockResolvedValue({
          currentAuthType: 'password',
          availableBiometryType: null,
        });
        mockUseAuthCapabilities.mockReturnValue({
          capabilities: {
            ...defaultCapabilities,
            authType: AUTHENTICATION_TYPE.PASSWORD,
          },
          isLoading: false,
        });
        mockUnlockWallet.mockRejectedValueOnce(
          new Error(DENY_PIN_ERROR_ANDROID),
        );

        const { getByTestId, queryByTestId } = renderWithProvider(<Login />);

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
        mockLogger.error.mockClear();

        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

        fireEvent.changeText(passwordInput, 'some-password');
        fireEvent(passwordInput, 'submitEditing');

        await waitFor(() => {
          expect(
            queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
          ).not.toBeOnTheScreen();
        });
        expect(mockLogger.error).not.toHaveBeenCalled();
      } finally {
        jest.useFakeTimers();
      }
    });

    it('does not log error on Android biometric cancellation', async () => {
      jest.useRealTimers();
      try {
        mockGetAuthType.mockReset();
        mockGetAuthType.mockResolvedValue({
          currentAuthType: 'password',
          availableBiometryType: null,
        });
        mockUseAuthCapabilities.mockReturnValue({
          capabilities: {
            ...defaultCapabilities,
            authType: AUTHENTICATION_TYPE.PASSWORD,
          },
          isLoading: false,
        });
        mockUnlockWallet.mockRejectedValueOnce(
          new Error(DENY_PIN_ERROR_ANDROID),
        );

        const { getByTestId, queryByTestId } = renderWithProvider(<Login />);

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
        mockLogger.error.mockClear();

        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        fireEvent.changeText(passwordInput, 'valid-password123');
        fireEvent(passwordInput, 'submitEditing');

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(
          queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
        ).not.toBeOnTheScreen();
      } finally {
        jest.useFakeTimers();
      }
    });

    it('does not show error UI on iOS biometric cancellation via password unlock', async () => {
      jest.useRealTimers();
      try {
        mockGetAuthType.mockReset();
        mockGetAuthType.mockResolvedValue({
          currentAuthType: 'password',
          availableBiometryType: null,
        });
        mockUseAuthCapabilities.mockReturnValue({
          capabilities: {
            ...defaultCapabilities,
            authType: AUTHENTICATION_TYPE.PASSWORD,
          },
          isLoading: false,
        });
        mockUnlockWallet.mockRejectedValueOnce(
          new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
        );

        const { getByTestId, queryByTestId } = renderWithProvider(<Login />);

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
        mockLogger.error.mockClear();

        const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
        fireEvent.changeText(passwordInput, 'valid-password123');
        fireEvent(passwordInput, 'submitEditing');

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(
          queryByTestId(LoginViewSelectors.PASSWORD_ERROR),
        ).not.toBeOnTheScreen();
      } finally {
        jest.useFakeTimers();
      }
    });
  });

  describe('Seedless password sync (biometric fallback alert)', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
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
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'password',
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

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

      expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith({
        skipCache: false,
        captureSentryError: true,
      });
      expect(mockUnlockWallet).toHaveBeenCalledWith({
        password: 'valid-password123',
      });
      expect(mockGetAuthType).toHaveBeenCalled();
    });

    it('does not call getAuthType when seedless password is not outdated', async () => {
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(<Login />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const getAuthTypeCallCountAfterMount = mockGetAuthType.mock.calls.length;

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      expect(mockGetAuthType.mock.calls.length).toBe(
        getAuthTypeCallCountAfterMount,
      );
    });

    it('skips alert branch for BIOMETRIC auth type', async () => {
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'biometrics',
        availableBiometryType: 'FaceID',
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith({
          skipCache: false,
          captureSentryError: true,
        });
      });
    });

    it('skips alert branch when device has no biometry support', async () => {
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      mockGetAuthType.mockResolvedValue({
        currentAuthType: 'password',
        availableBiometryType: null,
      });

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      fireEvent.changeText(passwordInput, 'valid-password123');
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(mockUnlockWallet).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith({
          skipCache: false,
          captureSentryError: true,
        });
      });
    });
  });

  describe('Navigation and lifecycle', () => {
    it('navigates to forgot password modal when reset wallet is pressed', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
      });
    });

    it('navigates to rehydrate on seedless onboarding error', async () => {
      mockUnlockWallet.mockRejectedValueOnce(
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

    it('registers and deregisters back handler on mount/unmount', () => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
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

    it('locks app on back button press', () => {
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      renderWithProvider(<Login />);

      const handleBackPress = mockBackHandlerAddEventListener.mock.calls[0][1];
      const result = handleBackPress();

      expect(mockLockApp).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('shows security alert when passcode is not set', async () => {
      mockUnlockWallet.mockRejectedValueOnce(new Error(PASSCODE_NOT_SET_ERROR));

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

  describe('Login button disabled state', () => {
    it('renders login button as disabled when password is empty', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

      expect(loginButton).toBeDisabled();
    });

    it('tracks FORGOT_PASSWORD_CLICKED when reset wallet is pressed', () => {
      const { getByTestId } = renderWithProvider(<Login />);
      fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));
      expect(mockTrackOnboarding).toHaveBeenCalledWith(
        MetaMetricsEvents.FORGOT_PASSWORD_CLICKED,
        expect.any(Function),
      );
    });

    it('tracks LOGIN_DOWNLOAD_LOGS on long press', () => {
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
      mockUnlockWallet.mockReset().mockRejectedValueOnce(new Error(errorMsg));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'wrong-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
      expect(loginButton).not.toBeDisabled();
    });
  });

  describe('Trace integration', () => {
    it('calls trace for AuthenticateUser during login', async () => {
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
  });

  describe('Platform configuration', () => {
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
        params: { locked: false, oauthLoginSuccess: false },
      });
      const { UNSAFE_root } = renderWithProvider(<Login />);
      const scrollView = UNSAFE_root.findByProps({ extraScrollHeight: 50 });
      expect(scrollView).toBeDefined();
      expect(scrollView.props.extraScrollHeight).toBe(50);
    });

    it('sets extraScrollHeight to 0 on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockRoute.mockReturnValue({
        params: { locked: false, oauthLoginSuccess: false },
      });
      const { UNSAFE_root } = renderWithProvider(<Login />);
      const scrollView = UNSAFE_root.findByProps({ extraScrollHeight: 0 });
      expect(scrollView).toBeDefined();
      expect(scrollView.props.extraScrollHeight).toBe(0);
    });
  });
});
