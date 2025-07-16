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
  ONBOARDING_WIZARD,
} from '../../../constants/storage';
import { strings } from '../../../../locales/i18n';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import { internalAccount1 as mockAccount } from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import branch from 'react-native-branch';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';

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

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  init: jest.fn(),
  parse: jest.fn(),
}));

jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    init: jest.fn().mockResolvedValue(undefined),
    postInit: (cb: () => void) => cb(),
  }),
}));

jest.mock('../../../../app/core/WalletConnect/WalletConnectV2', () => ({
  init: jest.fn().mockResolvedValue(undefined),
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
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
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
  },
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
  });
  describe('OnboardingRootNav', () => {
    it('renders the very first onboarding screen when you navigate into OnboardingRootNav', async () => {
      const routeState = {
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            state: {
              index: 0,
              routes: [
                {
                  name: Routes.ONBOARDING.NAV,
                  state: {
                    index: 0,
                    routes: [
                      {
                        name: 'OnboardingCarousel',
                        params: {},
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
      const mockStore = configureMockStore();
      const store = mockStore(initialState);

      const Providers = ({ children }: { children: React.ReactElement }) => (
        <NavigationContainer initialState={routeState}>
          <Provider store={store}>
            <ThemeContext.Provider value={mockTheme}>
              {children}
            </ThemeContext.Provider>
          </Provider>
        </NavigationContainer>
      );

      const { getByText } = render(<App />, { wrapper: Providers });

      expect(
        getByText(strings('onboarding_carousel.get_started')),
      ).toBeTruthy();
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
        if (key === ONBOARDING_WIZARD) {
          return true;
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
        expect(getByText('Edit Account Name')).toBeTruthy();
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

  describe('Branch deeplink handling', () => {
    it('initializes SharedDeeplinkManager with navigation and dispatch', async () => {
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(SharedDeeplinkManager.init).toHaveBeenCalledWith({
          navigation: expect.any(Object),
          dispatch: expect.any(Function),
        });
      });
    });
    it('calls getBranchDeeplink immediately for cold start deeplink check', async () => {
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
      });
    });
    it('processes cold start deeplink when non-branch link is found', async () => {
      const mockDeeplink = 'https://link.metamask.io/home';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
        '+non_branch_link': mockDeeplink,
      });
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
        expect(AppStateEventProcessor.setCurrentDeeplink).toHaveBeenCalledWith(
          mockDeeplink,
        );
      });
    });

    it('subscribes to Branch deeplink events', async () => {
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.subscribe).toHaveBeenCalled();
      });
    });
    it('processes deeplink from subscription callback when uri is provided', async () => {
      const mockUri = 'https://link.metamask.io/home';
      const mockDeeplink = 'https://link.metamask.io/swap';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
        '+non_branch_link': mockDeeplink,
      });
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
      });
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      subscribeCallback({ uri: mockUri });
      await waitFor(() => {
        expect(AppStateEventProcessor.setCurrentDeeplink).toHaveBeenCalledWith(
          mockUri,
        );
      });
    });
  });
});
