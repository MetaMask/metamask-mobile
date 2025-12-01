// Mock Logger
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock FilesystemStorage
jest.mock('redux-persist-filesystem-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock getVaultFromBackup
jest.mock('../../../core/BackupVault', () => ({
  getVaultFromBackup: jest.fn(() =>
    Promise.resolve({ success: false, vault: null }),
  ),
}));

// Mock animation components - using existing mocks
jest.mock('../../UI/FoxAnimation/FoxAnimation');
jest.mock('../../UI/OnboardingAnimation/OnboardingAnimation');

import React from 'react';
import {
  InteractionManager,
  BackHandler,
  Animated,
  Platform,
} from 'react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Onboarding from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Device from '../../../util/device';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import { strings } from '../../../../locales/i18n';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';
import Logger from '../../../util/Logger';
import { MIGRATION_ERROR_HAPPENED } from '../../../constants/storage';

// Mock netinfo - using existing mock
jest.mock('@react-native-community/netinfo');

// Create a mutable mock for isE2E that can be controlled per test
let mockIsE2E = false;
jest.mock('../../../util/test/utils', () => ({
  ...jest.requireActual('../../../util/test/utils'),
  get isE2E() {
    return mockIsE2E;
  },
}));

import { fetch as netInfoFetch } from '@react-native-community/netinfo';

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
  setItem: jest.fn(),
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
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
    trackEvent: mockTrackEvent,
    enable: mockEnable,
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
    createEventBuilder: () => EventBuilder;
  };
}

jest.mock(
  '../../hooks/useMetrics/withMetricsAwareness',
  () =>
    <P extends object>(Component: React.ComponentType<P & MetricsProps>) =>
    (props: P) => (
      <Component
        {...props}
        metrics={{
          isEnabled: mockMetricsIsEnabled,
          trackEvent: mockTrackEvent,
          enable: mockEnable,
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

// Mock React Navigation hooks
const mockRoute = {
  params: {},
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNav,
  useRoute: () => mockRoute,
}));

describe('Onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnable.mockClear();
    mockCreateEventBuilder.mockClear();

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

    Platform.OS = 'ios';
  });

  it('renders correctly', () => {
    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with large device and iphoneX', () => {
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

  it('renders correctly with medium device and android', () => {
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

  it('renders correctly with android', () => {
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

  it('handles click on create wallet button', () => {
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

  it('handles click on have an existing wallet button', () => {
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

    it('navigates to onboarding sheet when create wallet is pressed for new user', async () => {
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

    it('navigates to ChoosePassword when create wallet is pressed with seedless disabled', async () => {
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

    it('navigates to offline error sheet when there is no internet', async () => {
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
    it('navigates to onboarding sheet when have an existing wallet button is pressed for new user', async () => {
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

    it('navigates to import flow when import wallet is pressed with seedless disabled', async () => {
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

      expect(mockEnable).toHaveBeenCalledWith(false);
    });
  });

  describe('Navigation behavior', () => {
    it('navigates to HOME_NAV when unlock is pressed and password is not set', async () => {
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

    it('navigates to LOGIN when unlock is pressed and password is set', async () => {
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
    it('checks for existing user on mount', async () => {
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

    it('disables back press when component mounts', () => {
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

    it('triggers animatedTimingStart', async () => {
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
        jest.advanceTimersByTime(1000);
      });

      expect(animatedTimingSpy).toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(2000);
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

    it('calls Google OAuth login for create wallet flow on iOS and navigates to SocialLoginSuccessNewUser', async () => {
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
        false,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER,
        expect.objectContaining({
          accountName: 'test@example.com',
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('calls Google OAuth login for create wallet flow on Android and navigates directly to ChoosePassword', async () => {
      Platform.OS = 'android'; // Set platform to Android
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

      expect(mockCreateLoginHandler).toHaveBeenCalledWith('android', 'google');
      expect(mockOAuthService.handleOAuthLogin).toHaveBeenCalledWith(
        'mockGoogleHandler',
        false,
      );
      // On Android, should navigate directly to ChoosePassword, not SocialLoginSuccessNewUser
      expect(mockNavigate).toHaveBeenCalledWith(
        'ChoosePassword',
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );

      // Reset Platform.OS back to iOS for other tests
      Platform.OS = 'ios';
    });

    it('calls Apple OAuth login for create wallet flow on iOS and navigates to SocialLoginSuccessNewUser', async () => {
      mockCreateLoginHandler.mockReturnValue('mockAppleHandler');
      mockOAuthService.handleOAuthLogin.mockResolvedValue({
        type: 'success',
        existingUser: false,
        accountName: 'test@icloud.com',
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

      const appleOAuthFunction = navCall[1].params.onPressContinueWithApple;

      await act(async () => {
        await appleOAuthFunction(true);
      });

      expect(mockCreateLoginHandler).toHaveBeenCalledWith('ios', 'apple');
      expect(mockOAuthService.handleOAuthLogin).toHaveBeenCalledWith(
        'mockAppleHandler',
        false,
      );
      // On iOS with Apple login, should navigate to SocialLoginSuccessNewUser
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER,
        expect.objectContaining({
          accountName: 'test@icloud.com',
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('calls Apple OAuth login for import wallet flow', async () => {
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
        true,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER,
        expect.objectContaining({
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: expect.any(Object),
        }),
      );
    });

    it('shows error sheet for OAuth user cancellation', async () => {
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

    it('navigates to AccountAlreadyExists for existing user in create wallet flow', async () => {
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

    it('navigates to AccountNotFound for new user in import wallet flow', async () => {
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

    it('shows error sheet for OAuth when no credential is available in Android', async () => {
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

    it('shows error sheet for OAuth when no matching credential in Android', async () => {
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

    it('enables social login metrics when OAuth login succeeds', async () => {
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

      expect(mockEnable).toHaveBeenCalledWith(true);
    });
  });

  describe('checkForMigrationFailureAndVaultBackup', () => {
    const mockGetVaultFromBackup = getVaultFromBackup as jest.Mock;
    const mockFilesystemGetItem = FilesystemStorage.getItem as jest.Mock;
    const mockNavReset = mockNav.reset as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockFilesystemGetItem.mockResolvedValue(null);
      mockGetVaultFromBackup.mockResolvedValue({
        success: false,
        vault: null,
      });
      mockIsE2E = false;
    });

    it('returns early when route.params.delete is true', async () => {
      // Arrange
      mockGetVaultFromBackup.mockClear();
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Act - Component mounts and checkForMigrationFailureAndVaultBackup is called
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert - When delete param is true, vault backup check is never reached
      expect(mockGetVaultFromBackup).not.toHaveBeenCalled();
    });

    it('skips vault backup check when running in E2E test environment', async () => {
      // Arrange
      mockIsE2E = true;
      mockGetVaultFromBackup.mockClear();

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert - When in E2E mode, vault backup check is never reached
      expect(mockGetVaultFromBackup).not.toHaveBeenCalled();

      // Cleanup
      mockIsE2E = false;
    });

    it('checks migration error flag when not E2E and no delete param', async () => {
      // Arrange
      mockFilesystemGetItem.mockClear();
      mockFilesystemGetItem.mockResolvedValue(null);

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      // Assert
      await waitFor(() => {
        expect(mockFilesystemGetItem).toHaveBeenCalledWith(
          MIGRATION_ERROR_HAPPENED,
        );
      });
    });

    it('does not redirect when migration error flag is not set', async () => {
      // Arrange
      mockFilesystemGetItem.mockResolvedValue(null);
      mockGetVaultFromBackup.mockResolvedValue({
        success: true,
        vault: 'mock-vault',
      });

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert
      expect(mockNavReset).not.toHaveBeenCalled();
    });

    it('does not redirect when migration error flag is set but vault backup does not exist', async () => {
      // Arrange
      mockFilesystemGetItem.mockResolvedValue('true');
      mockGetVaultFromBackup.mockResolvedValue({
        success: false,
        vault: null,
      });

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert
      expect(mockGetVaultFromBackup).toHaveBeenCalled();
      expect(mockNavReset).not.toHaveBeenCalled();
    });

    it('redirects to vault recovery when migration error flag is set and vault backup exists', async () => {
      // Arrange
      mockFilesystemGetItem.mockResolvedValue('true');
      mockGetVaultFromBackup.mockResolvedValue({
        success: true,
        vault: 'mock-vault-data',
      });

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      // Assert
      await waitFor(() => {
        expect(mockNavReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
        });
      });
    });

    it('handles errors during vault backup check gracefully', async () => {
      // Arrange
      const mockError = new Error('Vault backup check failed');
      mockFilesystemGetItem.mockResolvedValue('true');
      mockGetVaultFromBackup.mockRejectedValue(mockError);

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        'Failed to check for migration failure and vault backup',
      );
      expect(mockNavReset).not.toHaveBeenCalled();
    });

    it('handles errors during FilesystemStorage read gracefully', async () => {
      // Arrange
      const mockError = new Error('FilesystemStorage read failed');
      mockFilesystemGetItem.mockRejectedValue(mockError);

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        'Failed to check for migration failure and vault backup',
      );
      expect(mockNavReset).not.toHaveBeenCalled();
    });

    it('accesses existingUser prop from Redux state', async () => {
      // Arrange
      const { toJSON } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialStateWithExistingUser,
        },
      );

      // Act - Component mounts and reads existingUser from props
      await waitFor(() => {
        expect(toJSON()).toBeDefined();
      });

      // Assert - Component renders without errors when existingUser is true
      expect(toJSON()).toBeTruthy();
    });

    it('reads existingUser as false for new users', async () => {
      // Arrange
      const { toJSON } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      // Act - Component mounts with existingUser false
      await waitFor(() => {
        expect(toJSON()).toBeDefined();
      });

      // Assert - Component handles new user case without errors
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('showNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
        remove: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls Animated.timing when delete param is present', async () => {
      // Arrange
      const animatedTimingSpy = jest.spyOn(Animated, 'timing');

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Assert - Animation is triggered
      await waitFor(() => {
        expect(animatedTimingSpy).toHaveBeenCalled();
      });

      animatedTimingSpy.mockRestore();
    });

    it('calls BackHandler.addEventListener when notification is shown', async () => {
      // Arrange
      const backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener');

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Assert - Verifies disableBackPress was called
      await waitFor(() => {
        expect(backHandlerSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });

      backHandlerSpy.mockRestore();
    });

    it('registers event listener with handler function', async () => {
      // Arrange
      const backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener');

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Assert - BackHandler.addEventListener called with function handler
      await waitFor(() => {
        expect(backHandlerSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });

      backHandlerSpy.mockRestore();
    });
  });

  describe('disableBackPress', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
        remove: jest.fn(),
      }));
    });

    it('creates hardwareBackPress handler function', async () => {
      // Arrange
      const backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener');

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Assert - Verifies handler function is created and registered
      await waitFor(() => {
        expect(backHandlerSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });

      backHandlerSpy.mockRestore();
    });

    it('registers event listener with hardwareBackPress event name', async () => {
      // Arrange
      const backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener');

      // Act
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      // Assert - Event listener registered with correct event name
      await waitFor(() => {
        expect(backHandlerSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });

      const callArgs = backHandlerSpy.mock.calls[0];
      expect(callArgs[0]).toBe('hardwareBackPress');

      backHandlerSpy.mockRestore();
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

    it('triggers ErrorBoundary for OAuth login failures when analytics disabled', async () => {
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

    it('does not trigger ErrorBoundary for OAuth login failures when analytics enabled', async () => {
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
});
