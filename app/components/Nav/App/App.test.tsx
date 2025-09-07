import React from 'react';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import App from '.';
import { MetaMetrics } from '../../../core/Analytics';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { RootState } from '../../../reducers';
import Routes from '../../../constants/navigation/Routes';
import {
  OPTIN_META_METRICS_UI_SEEN,
  EXISTING_USER,
} from '../../../constants/storage';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
// eslint-disable-next-line
import * as NavigationNative from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { Linking } from 'react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import { internalAccount1 as mockAccount } from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  init: jest.fn(),
  parse: jest.fn(),
}));

const mockIsWC2Enabled = true;
jest.mock('../../../../app/core/WalletConnect/WalletConnectV2', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  get isWC2Enabled() {
    return mockIsWC2Enabled;
  },
}));

jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: () => ({
    isEnabled: jest.fn().mockReturnValue(false),
    getMetaMetricsId: jest.fn(),
  }),
}));

jest.mock('../../../lib/ppom/PPOMView', () => ({ PPOMView: () => null }));

jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn(),
}));

jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

// expo library are not supported in jest ( unless using jest-expo as preset ), so we need to mock them
jest.mock('../../../core/OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

// Mock the navigation hook
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockRoutes = [
  {
    name: 'OnboardingRootNav',
    state: {
      index: 0,
      routes: [
        {
          name: 'OnboardingNav',
          state: {
            index: 0,
            routes: [
              {
                name: 'Onboarding',
                params: {},
              },
            ],
          },
        },
      ],
    },
  },
];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
  useNavigationState: (
    selector: (state: { routes: typeof mockRoutes }) => unknown,
  ) => selector({ routes: mockRoutes }),
}));

jest.mock('../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  configure: jest.fn(),
  addTraitsToUser: jest.fn(),
};

// Mock Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    appTriggeredAuth: jest.fn().mockResolvedValue(undefined),
    lockApp: jest.fn(),
    checkIsSeedlessPasswordOutdated: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock AppStateEventProcessor
jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

// Mock checkForDeeplink action
jest.mock('../../../actions/user', () => ({
  checkForDeeplink: jest.fn(() => ({ type: 'CHECK_FOR_DEEPLINK' })),
}));

// Need to mock this module since it uses store.getState, which interferes with the mocks from this test file.
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

// Mock essential dependencies
jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getBundleId: jest.fn().mockReturnValue('io.metamask'),
}));

jest.mock('../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../selectors/accountsController'),
  getMemoizedInternalAccountByAddress: jest.fn(() => mockAccount),
}));

jest.mock('../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../selectors/networkController'),
  selectChainId: jest.fn().mockReturnValue('1'),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: () => mockAccount,
}));

jest.mock('../../../components/hooks/useAsyncResult', () => ({
  useAsyncResultOrThrow: jest.fn().mockResolvedValue({
    pending: false,
    value: {},
  }),
}));

// Mock 7702 networks
jest.mock(
  '../../../components/Views/confirmations/hooks/7702/useEIP7702Networks',
  () => ({
    useEIP7702Networks: jest.fn().mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: false,
    }),
  }),
);

jest.mock('../../../core/Multichain/networks', () => ({
  getMultichainBlockExplorer: jest.fn().mockReturnValue({
    url: 'https://etherscan.io/address/0x1232323',
    title: 'Etherscan (Multichain)',
    blockExplorerName: 'Etherscan (Multichain)',
  }),
}));

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('App', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('configures MetaMetrics instance and identifies user on startup', async () => {
    renderScreen(App, { name: 'App' }, { state: initialState });
    await waitFor(() => {
      expect(mockMetrics.configure).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication flow logic', () => {
    it('skips auto-authentication if previous route is SettingsView', async () => {
      // Arrange: mock routes so previous route is SettingsView
      const mockRoutesSettings = [
        { name: 'SomeOtherRoute' },
        { name: Routes.SETTINGS_VIEW },
      ];
      jest
        .spyOn(NavigationNative, 'useNavigationState')
        .mockImplementation((selector: unknown) =>
          (selector as (state: { routes: { name: string }[] }) => unknown)({
            routes: mockRoutesSettings,
          }),
        );
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true); // existingUser = true

      renderScreen(App, { name: 'App' }, { state: initialState });

      await waitFor(() => {
        expect(Authentication.appTriggeredAuth).not.toHaveBeenCalled();
      });
    });

    it('runs auto-authentication if previous route is not SettingsView', async () => {
      // Arrange: mock routes so previous route is not SettingsView
      const mockRoutesOther = [
        { name: 'SomeOtherRoute' },
        { name: 'AnotherRoute' },
      ];
      jest
        .spyOn(NavigationNative, 'useNavigationState')
        .mockImplementation((selector: unknown) =>
          (selector as (state: { routes: { name: string }[] }) => unknown)({
            routes: mockRoutesOther,
          }),
        );
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true); // existingUser = true

      // Mock the user to be logged in so the component reaches the authentication flow
      const loggedInState = {
        ...initialState,
        user: {
          ...initialState.user,
          existingUser: true,
          userLoggedIn: true,
        },
      };

      renderScreen(App, { name: 'App' }, { state: loggedInState });

      await waitFor(() => {
        expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      });
    });

    it('navigates to onboarding when user does not exist', async () => {
      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: {
              ...initialState.user,
              existingUser: false,
            },
          },
        },
      );
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
        });
      });
    });
    it('navigates to login when user exists and logs in', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return true; // OptinMetrics UI has been seen
        }
        return null; // Default for other keys
      });
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: {
              ...initialState.user,
              existingUser: true,
            },
          },
        },
      );
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
        });
      });
    });

    it('navigates to OptinMetrics when user exists and OptinMetaMetricsUISeen is false', async () => {
      // Mock StorageWrapper.getItem to return different values based on the key
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return false; // OptinMetrics UI has not been seen
        }
        return null; // Default for other keys
      });

      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: {
              ...initialState.user,
              existingUser: true,
            },
          },
        },
      );

      // Wait a bit longer and add debugging
      await waitFor(
        () => {
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
        },
        { timeout: 5000 },
      );
    });

    describe('Seedless onboarding password outdated check', () => {
      const LoggerMock = jest.requireMock('../../../util/Logger');

      const seedlessOnboardingState = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine?.backgroundState,
            SeedlessOnboardingController: {
              vault: 'encrypted-vault-data', // This makes selectSeedlessOnboardingLoginFlow return true
            },
          },
        },
      };

      beforeEach(() => {
        jest.clearAllMocks();
        jest
          .spyOn(StorageWrapper, 'getItem')
          .mockImplementation(async (key) => {
            if (key === EXISTING_USER) {
              return true; // User exists
            }
            if (key === OPTIN_META_METRICS_UI_SEEN) {
              return true; // OptinMetrics UI has been seen
            }
            return null; // Default for other keys
          });
        jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      });

      it('checks password outdated status and logs result when in seedless onboarding flow', async () => {
        // Arrange
        const mockCheckIsSeedlessPasswordOutdated = jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockResolvedValue(true);

        jest.useFakeTimers();
        // Act
        renderScreen(App, { name: 'App' }, { state: seedlessOnboardingState });
        // Assert
        await waitFor(() => {
          expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalled();
        });
      });

      it('handles errors when checking seedless password outdated status', async () => {
        // Arrange
        const testError = new Error('Authentication service error');
        const mockCheckIsSeedlessPasswordOutdated = jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockRejectedValue(testError);

        jest.useFakeTimers();
        // Act
        renderScreen(App, { name: 'App' }, { state: seedlessOnboardingState });
        // Assert
        await waitFor(() => {
          expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalled();
          expect(LoggerMock.error).toHaveBeenCalledWith(
            testError,
            'App: Error in checkIsSeedlessPasswordOutdated',
          );
        });
      });
    });

    describe('Deeplink handling useEffect', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest
          .spyOn(StorageWrapper, 'getItem')
          .mockImplementation(async (key) => {
            if (key === EXISTING_USER) {
              return true;
            }
            if (key === OPTIN_META_METRICS_UI_SEEN) {
              return true;
            }
            return null;
          });
        jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      });

      it('sets up URL event listener when component mounts', async () => {
        const mockLinking = jest.mocked(Linking);
        mockLinking.addEventListener = jest.fn();

        renderScreen(App, { name: 'App' }, { state: initialState });

        await waitFor(() => {
          expect(mockLinking.addEventListener).toHaveBeenCalledWith(
            'url',
            expect.any(Function),
          );
        });
      });

      it('processes deeplinks when URL events are received', async () => {
        const mockLinking = jest.mocked(Linking);
        let capturedCallback: ((params: { url: string }) => void) | undefined;
        let callbackCalled = false;

        mockLinking.addEventListener = jest
          .fn()
          .mockImplementation(
            (event: string, callback: (params: { url: string }) => void) => {
              if (event === 'url') {
                capturedCallback = (params) => {
                  callbackCalled = true;
                  callback(params);
                };
              }
            },
          );

        renderScreen(App, { name: 'App' }, { state: initialState });

        await waitFor(() => {
          expect(mockLinking.addEventListener).toHaveBeenCalled();
        });

        // Simulate URL event
        if (capturedCallback) {
          capturedCallback({ url: 'test://url' });
        }

        // Verify the callback was triggered
        expect(callbackCalled).toBe(true);
      });
    });
  });

  describe('Renders multichain account details', () => {
    const mockLoggedInState = {
      ...initialState,
      user: {
        userLoggedIn: true,
      },
      settings: {
        useBlockieIcon: true,
      },
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine?.backgroundState,
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              {
                type: KeyringTypes.hd,
                metadata: {
                  name: 'Test Keyring',
                  id: 'test-hd',
                },
                accounts: [mockAccount.address],
              },
            ],
          },
        },
      },
    };

    beforeAll(() => {
      jest.mock('react-native-safe-area-context', () => {
        const inset = { top: 0, right: 0, bottom: 0, left: 0 };
        const frame = { width: 0, height: 0, x: 0, y: 0 };
        return {
          SafeAreaProvider: jest
            .fn()
            .mockImplementation(({ children }) => children),
          SafeAreaConsumer: jest
            .fn()
            .mockImplementation(({ children }) => children(inset)),
          useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
          useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
        };
      });

      // Mock the storage item to simulate existing user and bypass onboarding
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === EXISTING_USER) {
          return true; // User exists
        }
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return true; // OptinMetrics UI has been seen
        }

        return null; // Default for other keys
      });

      // Mock Authentication to avoid auth flow
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();

      jest.mock('../../../core/Engine', () => ({
        context: {
          TransactionController: {
            isAtomicBatchSupported: () => true,
          },
        },
      }));
    });

    const renderAppWithRouteState = (
      routeState: PartialState<NavigationState>,
    ) => {
      const mockStore = configureMockStore();
      const store = mockStore(mockLoggedInState);

      const Providers = ({ children }: { children: React.ReactElement }) => (
        <NavigationContainer initialState={routeState}>
          <Provider store={store}>
            <ThemeContext.Provider value={mockTheme}>
              {children}
            </ThemeContext.Provider>
          </Provider>
        </NavigationContainer>
      );

      return render(<App />, { wrapper: Providers });
    };

    it('renders the multichain account details screen when navigated to', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS,
            params: {
              account: mockAccount,
            },
          },
        ],
      };

      const { getByTestId } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(
          getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
        ).toBeTruthy();
      });
    });

    it('renders the multichain account edit name screen when navigated to', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
            params: {
              screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
              params: {
                account: mockAccount,
              },
            },
          },
        ],
      };

      const { getByText } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(getByText('Account Group')).toBeTruthy();
      });
    });

    it('renders the multichain account share address screen when navigated to', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
            params: {
              screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
              params: {
                account: mockAccount,
              },
            },
          },
        ],
      };

      const { getByText } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(getByText('Share Address')).toBeTruthy();
      });
    });
  });

  describe('Navigation hooks usage', () => {
    it('should use useNavigationState to check previous route and skip auth when coming from Settings', async () => {
      // Arrange: mock routes so previous route is SettingsView
      const mockRoutesWithSettings = [
        { name: 'SomeOtherRoute' },
        { name: Routes.SETTINGS_VIEW },
        { name: 'CurrentRoute' },
      ];
      jest
        .spyOn(NavigationNative, 'useNavigationState')
        .mockImplementation((selector: unknown) =>
          (selector as (state: { routes: { name: string }[] }) => unknown)({
            routes: mockRoutesWithSettings,
          }),
        );
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true); // existingUser = true

      renderScreen(App, { name: 'App' }, { state: initialState });

      await waitFor(() => {
        expect(Authentication.appTriggeredAuth).not.toHaveBeenCalled();
      });
    });

    it('should use useNavigationState to check previous route and run auth when not coming from Settings', async () => {
      // Arrange: mock routes so previous route is not SettingsView
      const mockRoutesWithoutSettings = [
        { name: 'SomeOtherRoute' },
        { name: 'AnotherRoute' },
        { name: 'CurrentRoute' },
      ];
      jest
        .spyOn(NavigationNative, 'useNavigationState')
        .mockImplementation((selector: unknown) =>
          (selector as (state: { routes: { name: string }[] }) => unknown)({
            routes: mockRoutesWithoutSettings,
          }),
        );
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true); // existingUser = true

      // Mock the user to be logged in so the component reaches the authentication flow
      const loggedInState = {
        ...initialState,
        user: {
          ...initialState.user,
          existingUser: true,
          userLoggedIn: true,
        },
      };

      renderScreen(App, { name: 'App' }, { state: loggedInState });

      await waitFor(() => {
        expect(Authentication.appTriggeredAuth).toHaveBeenCalled();
      });
    });

    it('should use useNavigation.reset with correct parameters for onboarding navigation', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(false); // existingUser = false

      renderScreen(App, { name: 'App' }, { state: initialState });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
        });
      });
    });

    it('should use useNavigation.reset with correct parameters for home navigation when user exists', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return true; // OptinMetrics UI has been seen
        }
        return null; // Default for other keys
      });
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();

      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: {
              ...initialState.user,
              existingUser: true,
            },
          },
        },
      );

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
        });
      });
    });

    it('should use useNavigation.reset with correct parameters for optin metrics navigation', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return false; // OptinMetrics UI has not been seen
        }
        return null; // Default for other keys
      });

      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: {
              ...initialState.user,
              existingUser: true,
            },
          },
        },
      );

      await waitFor(() => {
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
    });
  });
});
