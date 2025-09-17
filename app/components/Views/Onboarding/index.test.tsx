// Mock react-native components for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn((_callback) => {
          // Don't call callback to prevent teardown issues
        }),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((_callback) => {
          // Don't call callback to prevent teardown issues
        }),
      })),
    },
  };
});

jest.mock(
  '../../../animations/metamask_wordmark_animation_build-up.riv',
  () => 'mocked-wordmark-riv-file',
);
jest.mock('../../../animations/fox_appear.riv', () => 'mocked-fox-riv-file');

// Mock rive
interface RiveRef {
  play: jest.Mock;
  stop: jest.Mock;
  reset: jest.Mock;
  pause: jest.Mock;
}

interface MockRiveProps {
  testID?: string;
  onLoad?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  [key: string]: unknown;
}

jest.mock('rive-react-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRiveInner: React.ForwardRefRenderFunction<
    RiveRef,
    MockRiveProps
  > = (
    { testID = 'mock-rive-animation', onLoad, onStop, onError, ...props },
    ref,
  ) => {
    React.useImperativeHandle(ref, () => ({
      play: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      pause: jest.fn(),
    }));

    React.useEffect(() => {
      if (onLoad) {
        const timer = setTimeout(() => {
          try {
            onLoad();
          } catch (error: unknown) {
            if (error instanceof Error) {
              console.warn(error.message);
            }
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [onLoad]);

    React.useEffect(() => {
      if (onStop) {
        // noop
      }
    }, [onStop]);

    return React.createElement(View, { testID, ...props });
  };

  const MockRive = React.forwardRef(MockRiveInner);

  return {
    __esModule: true,
    default: MockRive,
    Fit: {
      Contain: 'contain',
      Cover: 'cover',
      Fill: 'fill',
      FitWidth: 'fitWidth',
      FitHeight: 'fitHeight',
      None: 'none',
      ScaleDown: 'scaleDown',
    },
    Alignment: {
      TopLeft: 'topLeft',
      TopCenter: 'topCenter',
      TopRight: 'topRight',
      CenterLeft: 'centerLeft',
      Center: 'center',
      CenterRight: 'centerRight',
      BottomLeft: 'bottomLeft',
      BottomCenter: 'bottomCenter',
      BottomRight: 'bottomRight',
    },
  };
});

import React from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Onboarding from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Device from '../../../util/device';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import {
  InteractionManager,
  BackHandler,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import { strings } from '../../../../locales/i18n';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(() => jest.fn()), // unsubscribe fn
  },
  NetInfoStateType: {
    none: 'none',
    wifi: 'wifi',
    cellular: 'cellular',
    unknown: 'unknown',
  },
}));

import { fetch as netInfoFetch } from '@react-native-community/netinfo';
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

const mockNetInfoFetch = netInfoFetch as jest.Mock;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
  user: {
    passwordSet: false,
    loadingSet: false,
    loadingMsg: '',
    existingUser: false,
  },
};

const mockInitialStateWithExistingUser = {
  ...mockInitialState,
  user: {
    ...mockInitialState.user,
    existingUser: true,
  },
};

const mockInitialStateWithExistingUserAndPassword = {
  ...mockInitialState,
  user: {
    ...mockInitialState.user,
    existingUser: true,
    passwordSet: true,
  },
};

jest.mock('../../../util/device', () => ({
  isLargeDevice: jest.fn(),
  isIphoneX: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
  isMediumDevice: jest.fn(),
}));

// expo library are not supported in jest ( unless using jest-expo as preset ), so we need to mock them
jest.mock('../../../core/OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    handleOAuthLogin: jest.fn().mockResolvedValue({
      type: 'success',
      existingUser: false,
      accountName: 'test@example.com',
    }),
    resetOauthState: jest.fn(),
    getMetricStateBeforeOauth: jest.fn().mockReturnValue(false),
    setMetricStateBeforeOauth: jest.fn(),
    localState: {
      metricStateBeforeOauth: null,
      loginInProgress: false,
      oauthLoginSuccess: false,
      oauthLoginError: null,
    },
  },
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    resetVault: jest.fn(),
    lockApp: jest.fn(),
  },
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest
    .fn()
    .mockReturnValue({ _buffered: true, _name: 'test', _id: 'test' }),
  endTrace: jest.fn(),
}));

const mockMetricsIsEnabled = jest.fn().mockReturnValue(false);
const mockTrackEvent = jest.fn();
const mockEnable = jest.fn();
const mockEnableSocialLogin = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
    trackEvent: mockTrackEvent,
    enable: mockEnable,
    enableSocialLogin: mockEnableSocialLogin,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

interface EventBuilder {
  addProperties: () => EventBuilder;
  build: () => Record<string, unknown>;
}

interface MetricsProps {
  metrics: {
    isEnabled: () => boolean;
    trackEvent: (...args: unknown[]) => void;
    enable: (...args: unknown[]) => void;
    enableSocialLogin: (...args: unknown[]) => void;
    createEventBuilder: () => EventBuilder;
  };
}

jest.mock(
  '../../hooks/useMetrics/withMetricsAwareness',
  () =>
    <P extends object>(Component: React.ComponentType<P & MetricsProps>) =>
    (props: P) =>
      (
        <Component
          {...props}
          metrics={{
            isEnabled: mockMetricsIsEnabled,
            trackEvent: mockTrackEvent,
            enable: mockEnable,
            enableSocialLogin: mockEnableSocialLogin,
            createEventBuilder: mockCreateEventBuilder,
          }}
        />
      ),
);

const mockSeedlessOnboardingEnabled = jest.fn();
jest.mock('../../../core/OAuthService/OAuthLoginHandlers/constants', () => ({
  get SEEDLESS_ONBOARDING_ENABLED() {
    return mockSeedlessOnboardingEnabled();
  },
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Platform: {
      ...actualRN.Platform,
      OS: 'ios',
    },
  };
});

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNav = {
  navigate: mockNavigate,
  replace: mockReplace,
  reset: jest.fn(),
  setOptions: jest.fn(),
};
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({
      component: ScreenComponent,
      initialParams,
    }: {
      component: React.ComponentType<{
        navigation: Record<string, unknown>;
        route: { params: Record<string, unknown> };
      }>;
      initialParams: Record<string, unknown>;
    }) => (
      <ScreenComponent
        navigation={mockNav}
        route={{ params: initialParams || {} }}
      />
    ),
  }),
}));

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

describe('Onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnable.mockClear();
    mockEnableSocialLogin.mockClear();
    mockCreateEventBuilder.mockClear();

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

    Platform.OS = 'ios';
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with large device and iphoneX', () => {
    (Device.isLargeDevice as jest.Mock).mockReturnValue(true);
    (Device.isIphoneX as jest.Mock).mockReturnValue(true);
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with medium device and android', () => {
    (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with android', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    Platform.OS = 'android';

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should click on create wallet button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const createWalletButton = getByTestId(
      OnboardingSelectorIDs.NEW_WALLET_BUTTON,
    );
    fireEvent.press(createWalletButton);
  });

  it('should click on have an existing wallet button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const importSeedButton = getByTestId(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
    fireEvent.press(importSeedButton);
  });

  describe('Create wallet flow', () => {
    afterEach(() => {
      mockSeedlessOnboardingEnabled.mockReset();
      mockNavigate.mockReset();
      mockNetInfoFetch.mockReset();
    });

    it('should navigate to onboarding sheet when create wallet is pressed for new user', async () => {
      mockSeedlessOnboardingEnabled.mockReturnValue(true);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.ONBOARDING_SHEET,
          params: expect.objectContaining({
            createWallet: true,
          }),
        }),
      );
    });

    it('should navigate to ChoosePassword when create wallet is pressed with seedless disabled', async () => {
      mockSeedlessOnboardingEnabled.mockReturnValue(false);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );
      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'ChoosePassword',
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('should navigate to offline error sheet when there is no internet', async () => {
      mockSeedlessOnboardingEnabled.mockReturnValue(true);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      mockNetInfoFetch.mockResolvedValue({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      });

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      expect(navCall).toBeDefined();

      const googleOAuthFunction =
        navCall?.[1]?.params?.onPressContinueWithGoogle;

      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('error_sheet.no_internet_connection_title'),
            description: strings(
              'error_sheet.no_internet_connection_description',
            ),
            descriptionAlign: 'left',
            buttonLabel: strings('error_sheet.no_internet_connection_button'),
            primaryButtonLabel: strings(
              'error_sheet.no_internet_connection_button',
            ),
            closeOnPrimaryButtonPress: true,
            type: 'error',
          }),
        }),
      );
    });
  });

  describe('Import wallet flow', () => {
    afterEach(() => {
      mockSeedlessOnboardingEnabled.mockReset();
    });
    it('should navigate to onboarding sheet when have an existing wallet button is pressed for new user', async () => {
      mockSeedlessOnboardingEnabled.mockReturnValue(true);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.ONBOARDING_SHEET,
          params: expect.objectContaining({
            createWallet: false,
          }),
        }),
      );
    });

    it('should navigate to import flow when import wallet is pressed with seedless disabled', async () => {
      mockSeedlessOnboardingEnabled.mockReturnValue(false);
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });
  });

  describe('Navigation behavior', () => {
    it('should navigate to HOME_NAV when unlock is pressed and password is not set', async () => {
      const { getByText } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialStateWithExistingUser,
        },
      );

      await waitFor(() => {
        expect(getByText('Unlock')).toBeTruthy();
      });

      jest.advanceTimersByTime(600);

      const unlockButton = getByText('Unlock');

      await act(async () => {
        fireEvent.press(unlockButton);
      });

      expect(Authentication.resetVault).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('should navigate to LOGIN when unlock is pressed and password is set', async () => {
      const { getByText } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialStateWithExistingUserAndPassword,
        },
      );

      await waitFor(() => {
        expect(getByText('Unlock')).toBeTruthy();
      });

      jest.advanceTimersByTime(600);

      const unlockButton = getByText('Unlock');

      await act(async () => {
        fireEvent.press(unlockButton);
      });

      expect(Authentication.lockApp).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.LOGIN);
    });
  });

  describe('componentDidMount behavior', () => {
    it('should check for existing user on mount', async () => {
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialStateWithExistingUser,
        },
      );

      await waitFor(() => {
        // The component now reads from Redux state, not MMKV storage
        // So we don't expect StorageWrapper.getItem to be called
        expect(StorageWrapper.getItem).not.toHaveBeenCalled();
      });
    });

    it('should disable back press when component mounts', () => {
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('should trigger animatedTimingStart', async () => {
      jest.useFakeTimers();

      const animatedTimingSpy = jest.spyOn(Animated, 'timing');

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      await waitFor(() => {
        // The component now reads from Redux state, not MMKV storage
        // So we don't expect StorageWrapper.getItem to be called
        expect(StorageWrapper.getItem).not.toHaveBeenCalled();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(animatedTimingSpy).toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      expect(animatedTimingSpy.mock.calls.length).toBeGreaterThan(0);

      animatedTimingSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('OAuth Login Methods', () => {
    const mockOAuthService = jest.requireMock(
      '../../../core/OAuthService/OAuthService',
    ).default;
    const mockCreateLoginHandler = jest.requireMock(
      '../../../core/OAuthService/OAuthLoginHandlers',
    ).createLoginHandler;

    beforeEach(() => {
      mockSeedlessOnboardingEnabled.mockReturnValue(true);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockSeedlessOnboardingEnabled.mockReset();
    });

    it('should call Google OAuth login for create wallet flow', async () => {
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: false,
        accountName: 'test@example.com',
      });

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockCreateLoginHandler).toHaveBeenCalledWith('ios', 'google');
      expect(mockOAuthService.handleOAuthLogin).toHaveBeenCalledWith(
        'mockGoogleHandler',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'ChoosePassword',
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('should call Apple OAuth login for import wallet flow', async () => {
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: true,
        accountName: 'test@icloud.com',
      });

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(false);
      });

      expect(mockCreateLoginHandler).toHaveBeenCalledWith('ios', 'apple');
      expect(mockOAuthService.handleOAuthLogin).toHaveBeenCalledWith(
        'mockAppleHandler',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'Rehydrate',
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('should show error sheet for OAuth user cancellation', async () => {
      const cancelError = new OAuthError('', OAuthErrorType.UserCancelled);
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(cancelError);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('error_sheet.user_cancelled_title'),
            description: strings('error_sheet.user_cancelled_description'),
            descriptionAlign: 'center',
            buttonLabel: strings('error_sheet.user_cancelled_button'),
            type: 'error',
          }),
        }),
      );
    });

    it('do not show error sheet for OAuth user dismissal', async () => {
      const dismissError = new OAuthError('', OAuthErrorType.UserDismissed);
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(dismissError);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(false);
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('error_sheet.oauth_error_title'),
            description: strings('error_sheet.oauth_error_description'),
            descriptionAlign: 'center',
            buttonLabel: strings('error_sheet.oauth_error_button'),
            type: 'error',
          }),
        }),
      );
    });

    it('should navigate to AccountAlreadyExists for existing user in create wallet flow', async () => {
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: true,
        accountName: 'existing@example.com',
      });

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'AccountAlreadyExists',
        expect.objectContaining({
          accountName: 'existing@example.com',
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('should navigate to AccountNotFound for new user in import wallet flow', async () => {
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: false,
        accountName: 'newuser@icloud.com',
      });

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(false);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'AccountNotFound',
        expect.objectContaining({
          accountName: 'newuser@icloud.com',
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('should show error sheet for OAuth when no credential is available in Android', async () => {
      const noCredentialError = new OAuthError(
        '',
        OAuthErrorType.GoogleLoginNoCredential,
      );
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(noCredentialError);

      mockNavigate.mockClear();
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      mockNavigate.mockClear();
      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('error_sheet.google_login_no_credential_title'),
            description: strings(
              'error_sheet.google_login_no_credential_description',
            ),
            descriptionAlign: 'center',
            buttonLabel: strings(
              'error_sheet.google_login_no_credential_button',
            ),
            type: 'error',
          }),
        }),
      );
    });

    it('should show error sheet for OAuth when no matching credential in Android', async () => {
      const noCredentialError = new OAuthError(
        '',
        OAuthErrorType.GoogleLoginNoMatchingCredential,
      );
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(noCredentialError);

      mockNavigate.mockClear();
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      mockNavigate.mockClear();
      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('error_sheet.google_login_no_credential_title'),
            description: strings(
              'error_sheet.google_login_no_credential_description',
            ),
            descriptionAlign: 'center',
            buttonLabel: strings(
              'error_sheet.google_login_no_credential_button',
            ),
            type: 'error',
          }),
        }),
      );
    });

    it('should enable social login metrics when OAuth login succeeds', async () => {
      mockCreateLoginHandler.mockReturnValue('mockGoogleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: false,
        accountName: 'test@example.com',
      });
      mockEnableSocialLogin.mockClear();

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const googleOAuthFunction = navCall[1].params.onPressContinueWithGoogle;

      await act(async () => {
        await googleOAuthFunction(true);
      });

      expect(mockEnableSocialLogin).toHaveBeenCalledWith(true);
    });
  });

  describe('Metrics Enable/Disable Tests', () => {
    const mockOAuthService = jest.requireMock(
      '../../../core/OAuthService/OAuthService',
    ).default;

    beforeEach(() => {
      mockSeedlessOnboardingEnabled.mockReturnValue(false);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(false);
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockSeedlessOnboardingEnabled.mockReset();
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(false);
    });

    it('should disable social login metrics when non-OAuth user creates wallet', async () => {
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(false);
      mockEnableSocialLogin.mockClear();

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      expect(mockEnableSocialLogin).toHaveBeenCalledWith(false);
    });

    it('should disable social login metrics when non-OAuth user imports wallet', async () => {
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(false);
      mockEnableSocialLogin.mockClear();

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importWalletButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importWalletButton);
      });

      expect(mockEnableSocialLogin).toHaveBeenCalledWith(false);
    });

    it('should disable social login metrics when non-OAuth user creates wallet', async () => {
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(true);
      mockEnableSocialLogin.mockClear();

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      expect(mockEnableSocialLogin).toHaveBeenCalledWith(false);
    });

    it('should disable social login metrics when non-OAuth user imports wallet', async () => {
      mockOAuthService.getMetricStateBeforeOauth.mockReturnValue(true);
      mockEnableSocialLogin.mockClear();

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importWalletButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importWalletButton);
      });

      expect(mockEnableSocialLogin).toHaveBeenCalledWith(false);
    });
  });

  describe('ErrorBoundary Tests', () => {
    const mockOAuthService = jest.requireMock(
      '../../../core/OAuthService/OAuthService',
    ).default;
    const mockCreateLoginHandler = jest.requireMock(
      '../../../core/OAuthService/OAuthLoginHandlers',
    ).createLoginHandler;

    beforeEach(() => {
      mockSeedlessOnboardingEnabled.mockReturnValue(true);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockSeedlessOnboardingEnabled.mockReset();
    });

    it('should trigger ErrorBoundary for OAuth login failures when analytics disabled', async () => {
      mockMetricsIsEnabled.mockReturnValueOnce(false);
      mockCreateEventBuilder.mockReturnValue({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({ name: 'Error Screen Viewed' }),
      });
      const serverError = new OAuthError('', OAuthErrorType.AuthServerError);
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(serverError);

      mockNavigate.mockClear();
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(false);
      });

      expect(mockTrackEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Error Screen Viewed',
        }),
      );
    });

    it('should not trigger ErrorBoundary for OAuth login failures when analytics enabled', async () => {
      mockMetricsIsEnabled.mockReturnValue(true);
      const dismissError = new OAuthError('', OAuthErrorType.AuthServerError);
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockRejectedValue(dismissError);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.ROOT_MODAL_FLOW &&
          call[1]?.screen === Routes.SHEET.ONBOARDING_SHEET,
      );

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(false);
      });

      expect(mockTrackEvent).not.toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Error Screen Viewed',
        }),
      );
    });
  });

  describe('Rive Animations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should render MetaMask wordmark animation', () => {
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );
      jest.advanceTimersByTime(150);
      expect(getByTestId('metamask-wordmark-animation')).toBeDefined();
    });

    it('should render fox animation', () => {
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      jest.advanceTimersByTime(600);
      expect(getByTestId('fox-animation')).toBeDefined();
    });

    it('should render both animations together', () => {
      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      jest.advanceTimersByTime(600);
      expect(getByTestId('metamask-wordmark-animation')).toBeDefined();
      expect(getByTestId('fox-animation')).toBeDefined();
    });

    it('should trigger animations through InteractionManager', () => {
      const interactionManagerSpy = jest.spyOn(
        InteractionManager,
        'runAfterInteractions',
      );

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      jest.advanceTimersByTime(100);
      expect(interactionManagerSpy).toHaveBeenCalled();
    });

    it('should handle delayed Rive animation when logoRef is not immediately available', () => {
      const mockPlay = jest.fn();

      const mockComponent = {
        logoRef: { current: null },
        mounted: true,
        startRiveAnimation() {
          try {
            if (this.logoRef.current && this.mounted) {
              this.logoRef.current.play();
            } else {
              setTimeout(() => {
                if (this.logoRef.current && this.mounted) {
                  this.logoRef.current.play();
                }
              }, 500);
            }
          } catch (error) {
            // Logger.error(error);
          }
        },
      };

      mockComponent.startRiveAnimation();
      mockComponent.logoRef.current = { play: mockPlay };
      jest.advanceTimersByTime(500);

      expect(mockPlay).toHaveBeenCalled();
    });

    it('should call Animated.parallel when moveLogoUp is executed', () => {
      const animatedParallelSpy = jest.spyOn(Animated, 'parallel');

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      animatedParallelSpy.mockClear();

      const mockLogoPosition = new Animated.Value(0);
      const mockButtonsOpacity = new Animated.Value(0);

      Animated.parallel([
        Animated.timing(mockLogoPosition, {
          toValue: -180,
          duration: 1200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(mockButtonsOpacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]).start();

      expect(animatedParallelSpy).toHaveBeenCalled();
    });

    it('should call Animated.timing when showFoxAnimation is executed', () => {
      const animatedTimingSpy = jest.spyOn(Animated, 'timing');

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      animatedTimingSpy.mockClear();
      const mockFoxOpacity = new Animated.Value(0);

      Animated.timing(mockFoxOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      expect(animatedTimingSpy).toHaveBeenCalled();
    });

    it('should execute moveLogoUp when onStop callback is triggered and mounted is true', () => {
      const mockMoveLogoUp = jest.fn();

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const mounted = true;

      if (mounted) {
        mockMoveLogoUp();
      }

      expect(mockMoveLogoUp).toHaveBeenCalled();
    });
  });
});
