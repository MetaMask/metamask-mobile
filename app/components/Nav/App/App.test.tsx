import React from 'react';
import { DeepPartial } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import App from '.';
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
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { View as MockView } from 'react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { internalAccount1 as mockAccount } from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../Views/MultichainAccounts/AccountDetails.testIds';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  engine: {
    backgroundState,
  },
};

const MOCK_FOX_LOADER_ID = 'FOX_LOADER_ID';

jest.mock(
  '../../UI/FoxLoader',
  () =>
    function MockFoxLoader() {
      return <MockView testID={MOCK_FOX_LOADER_ID} />;
    },
);

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

jest.mock('../../hooks/useOTAUpdates', () => ({
  useOTAUpdates: jest.fn(),
}));

jest.mock('../../UI/Predict/hooks/usePredictToastRegistrations', () => ({
  usePredictToastRegistrations: jest.fn().mockReturnValue([]),
}));

jest.mock('../../UI/Ramp/RampsBootstrap', () => () => null);

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
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

  describe('Renders multichain account details', () => {
    const mockAccountGroupId = 'keyring:test-hd/ethereum' as const;
    const mockAccountGroup = {
      id: mockAccountGroupId,
      accounts: [mockAccount.id],
      metadata: {
        name: 'Account Group',
      },
    };

    const mockLoggedInState = {
      ...initialState,
      user: {
        userLoggedIn: true,
      },
      settings: {
        avatarAccountType: AvatarAccountType.Maskicon,
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
          AccountTreeController: {
            accountTree: {
              wallets: {
                'test-hd': {
                  id: 'test-hd',
                  metadata: {
                    name: 'Test Keyring',
                  },
                  groups: {
                    [mockAccountGroupId]: mockAccountGroup,
                  },
                },
              },
            },
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
            name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS,
            params: {
              screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
              params: {
                accountGroup: mockAccountGroup,
              },
            },
          },
        ],
      };

      const { getByText } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(getByText('Account Group')).toBeTruthy();
        expect(getByText('Account name')).toBeTruthy();
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
        expect(getByText('Share address')).toBeTruthy();
      });
    });
  });

  describe('route registration', () => {
    const renderAppWithRouteState = (
      routeState: PartialState<NavigationState>,
    ) => {
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

      return render(<App />, { wrapper: Providers });
    };

    it('registers the eligibility failed modal route', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MODAL.ROOT_MODAL_FLOW,
            params: {
              screen: Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
            },
          },
        ],
      };

      const { getByTestId } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(getByTestId('eligibility-failed-modal')).toBeOnTheScreen();
      });
    });

    it('registers the ramp unsupported modal route', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MODAL.ROOT_MODAL_FLOW,
            params: {
              screen: Routes.SHEET.UNSUPPORTED_REGION_MODAL,
            },
          },
        ],
      };

      const { getByTestId } = renderAppWithRouteState(routeState);

      await waitFor(() => {
        expect(getByTestId('ramp-unsupported-modal')).toBeOnTheScreen();
      });
    });

    it('has wallet action modal routes defined', () => {
      expect(Routes.MODAL.WALLET_ACTIONS).toBeDefined();
      expect(Routes.MODAL.TRADE_WALLET_ACTIONS).toBeDefined();
      expect(Routes.MODAL.DELETE_WALLET).toBeDefined();
    });

    it('has sheet routes defined', () => {
      expect(Routes.SHEET.ACCOUNT_SELECTOR).toBeDefined();
      expect(Routes.SHEET.NETWORK_SELECTOR).toBeDefined();
      expect(Routes.SHEET.ONBOARDING_SHEET).toBeDefined();
      expect(Routes.SHEET.SDK_LOADING).toBeDefined();
    });

    it('has fund action menu route defined', () => {
      expect(Routes.MODAL.FUND_ACTION_MENU).toBeDefined();
    });

    it('has more token actions menu route defined', () => {
      expect(Routes.MODAL.MORE_TOKEN_ACTIONS_MENU).toBeDefined();
    });

    it('has modal confirmation routes defined', () => {
      expect(Routes.MODAL.MODAL_CONFIRMATION).toBeDefined();
      expect(Routes.MODAL.MODAL_MANDATORY).toBeDefined();
    });

    it('has sdk related routes defined', () => {
      expect(Routes.SHEET.SDK_FEEDBACK).toBeDefined();
      expect(Routes.SHEET.SDK_MANAGE_CONNECTIONS).toBeDefined();
      expect(Routes.SHEET.SDK_DISCONNECT).toBeDefined();
    });
  });

  describe('app route constants', () => {
    it('has onboarding flow routes defined', () => {
      expect(Routes.ONBOARDING.NAV).toBeDefined();
      expect(Routes.ONBOARDING.HOME_NAV).toBeDefined();
      expect(Routes.ONBOARDING.LOGIN).toBeDefined();
    });

    it('has hardware wallet routes defined', () => {
      expect(Routes.HW.CONNECT_LEDGER).toBeDefined();
      expect(Routes.HW.CONNECT).toBeDefined();
      expect(Routes.HW.SELECT_DEVICE).toBeDefined();
      expect(Routes.HW.LEDGER_CONNECT).toBeDefined();
    });

    it('has vault recovery routes defined', () => {
      expect(Routes.VAULT_RECOVERY.RESTORE_WALLET).toBeDefined();
      expect(Routes.VAULT_RECOVERY.WALLET_RESTORED).toBeDefined();
      expect(Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED).toBeDefined();
    });

    it('has network routes defined', () => {
      expect(Routes.ADD_NETWORK).toBeDefined();
      expect(Routes.EDIT_NETWORK).toBeDefined();
    });

    it('has lock screen route defined', () => {
      expect(Routes.LOCK_SCREEN).toBeDefined();
    });

    it('has confirmation routes defined', () => {
      expect(Routes.CONFIRMATION_REQUEST_MODAL).toBeDefined();
      expect(Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE).toBeDefined();
      expect(Routes.CONFIRMATION_PAY_WITH_MODAL).toBeDefined();
    });

    it('has multichain account routes defined', () => {
      expect(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS).toBeDefined();
      expect(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS).toBeDefined();
      expect(Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST).toBeDefined();
      expect(Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST).toBeDefined();
    });

    it('has ledger transaction modal routes defined', () => {
      expect(Routes.LEDGER_TRANSACTION_MODAL).toBeDefined();
      expect(Routes.LEDGER_MESSAGE_SIGN_MODAL).toBeDefined();
    });

    it('has QR signing routes defined', () => {
      expect(Routes.QR_SIGNING_TRANSACTION_MODAL).toBeDefined();
      expect(Routes.QR_TAB_SWITCHER).toBeDefined();
    });

    it('has edit account name route defined', () => {
      expect(Routes.EDIT_ACCOUNT_NAME).toBeDefined();
    });

    it('has multi SRP routes defined', () => {
      expect(Routes.MULTI_SRP.IMPORT).toBeDefined();
    });
  });
});
