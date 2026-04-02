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

    it('has options sheet route defined', () => {
      expect(Routes.OPTIONS_SHEET).toBeDefined();
    });

    it('has fox loader route defined', () => {
      expect(Routes.FOX_LOADER).toBeDefined();
    });

    it('has webview routes defined', () => {
      expect(Routes.WEBVIEW.SIMPLE).toBeDefined();
      expect(Routes.WEBVIEW.MAIN).toBeDefined();
    });
  });

  describe('App version handling', () => {
    it('should handle version storage operations', async () => {
      const mockStore = configureMockStore();
      const store = mockStore(initialState);

      const Providers = ({ children }: { children: React.ReactElement }) => (
        <NavigationContainer>
          <Provider store={store}>
            <ThemeContext.Provider value={mockTheme}>
              {children}
            </ThemeContext.Provider>
          </Provider>
        </NavigationContainer>
      );

      render(<App />, { wrapper: Providers });

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalled();
      });
    });
  });

  describe('App version handling branches', () => {
    const renderAppForVersionTest = (state: DeepPartial<RootState>) => {
      const mockStoreCreator = configureMockStore();
      const store = mockStoreCreator(state);
      const Providers = ({ children }: { children: React.ReactElement }) => (
        <NavigationContainer>
          <Provider store={store}>
            <ThemeContext.Provider value={mockTheme}>
              {children}
            </ThemeContext.Provider>
          </Provider>
        </NavigationContainer>
      );
      return render(<App />, { wrapper: Providers });
    };

    it('handles errors in startApp gracefully', async () => {
      const getItemSpy = jest
        .spyOn(StorageWrapper, 'getItem')
        .mockRejectedValue(new Error('Storage error'));

      renderAppForVersionTest(initialState);

      await waitFor(() => {
        expect(getItemSpy).toHaveBeenCalled();
      });

      getItemSpy.mockRestore();
    });
  });

  describe('AppFlow navigation structure', () => {
    const renderAppWithDefaultState = (
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

    it('renders the fox loader as initial route', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.FOX_LOADER }],
      };

      const { getByTestId } = renderAppWithDefaultState(routeState);

      await waitFor(() => {
        expect(getByTestId(MOCK_FOX_LOADER_ID)).toBeTruthy();
      });
    });

    it('renders the lock screen route', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.LOCK_SCREEN }],
      };

      const { toJSON } = renderAppWithDefaultState(routeState);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });
  });

  describe('Onboarding navigation', () => {
    it('has onboarding success flow route defined', () => {
      expect(Routes.ONBOARDING.SUCCESS_FLOW).toBeDefined();
    });

    it('has onboarding success route defined', () => {
      expect(Routes.ONBOARDING.SUCCESS).toBeDefined();
    });

    it('has onboarding default settings route defined', () => {
      expect(Routes.ONBOARDING.DEFAULT_SETTINGS).toBeDefined();
    });

    it('has onboarding general settings route defined', () => {
      expect(Routes.ONBOARDING.GENERAL_SETTINGS).toBeDefined();
    });

    it('has onboarding assets settings route defined', () => {
      expect(Routes.ONBOARDING.ASSETS_SETTINGS).toBeDefined();
    });

    it('has onboarding security settings route defined', () => {
      expect(Routes.ONBOARDING.SECURITY_SETTINGS).toBeDefined();
    });

    it('has onboarding import from secret recovery phrase route defined', () => {
      expect(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
      ).toBeDefined();
    });

    it('has social login routes defined', () => {
      expect(Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER).toBeDefined();
      expect(
        Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER,
      ).toBeDefined();
    });

    it('has wallet creation error route defined', () => {
      expect(Routes.ONBOARDING.WALLET_CREATION_ERROR).toBeDefined();
    });
  });

  describe('Detected tokens flow', () => {
    it('has detected tokens routes defined', () => {
      expect(Routes.SHEET.BASIC_FUNCTIONALITY).toBeDefined();
      expect(Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC).toBeDefined();
    });
  });

  describe('Multichain account details actions', () => {
    it('has multichain account details action routes defined', () => {
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.ACCOUNT_ACTIONS,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.LEGACY_EDIT_ACCOUNT_NAME,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SRP_REVEAL_QUIZ,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_PRIVATE_CREDENTIAL,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_SRP_CREDENTIAL,
      ).toBeDefined();
    });
  });

  describe('Root modal flow screens', () => {
    it('has seedphrase modal route defined', () => {
      expect(Routes.SHEET.SEEDPHRASE_MODAL).toBeDefined();
    });

    it('has skip account security modal route defined', () => {
      expect(Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL).toBeDefined();
    });

    it('has success error sheet route defined', () => {
      expect(Routes.SHEET.SUCCESS_ERROR_SHEET).toBeDefined();
    });

    it('has add account route defined', () => {
      expect(Routes.SHEET.ADD_ACCOUNT).toBeDefined();
    });

    it('has experience enhancer route defined', () => {
      expect(Routes.SHEET.EXPERIENCE_ENHANCER).toBeDefined();
    });

    it('has data collection route defined', () => {
      expect(Routes.SHEET.DATA_COLLECTION).toBeDefined();
    });

    it('has account connect route defined', () => {
      expect(Routes.SHEET.ACCOUNT_CONNECT).toBeDefined();
    });

    it('has account permissions route defined', () => {
      expect(Routes.SHEET.ACCOUNT_PERMISSIONS).toBeDefined();
    });

    it('has revoke all account permissions route defined', () => {
      expect(Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS).toBeDefined();
    });

    it('has connection details route defined', () => {
      expect(Routes.SHEET.CONNECTION_DETAILS).toBeDefined();
    });

    it('has permitted networks info sheet route defined', () => {
      expect(Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET).toBeDefined();
    });

    it('has token sort route defined', () => {
      expect(Routes.SHEET.TOKEN_SORT).toBeDefined();
    });

    it('has network manager route defined', () => {
      expect(Routes.SHEET.NETWORK_MANAGER).toBeDefined();
    });

    it('has ambiguous address route defined', () => {
      expect(Routes.SHEET.AMBIGUOUS_ADDRESS).toBeDefined();
    });

    it('has turn off remember me route defined', () => {
      expect(Routes.MODAL.TURN_OFF_REMEMBER_ME).toBeDefined();
    });

    it('has srp reveal quiz route defined', () => {
      expect(Routes.MODAL.SRP_REVEAL_QUIZ).toBeDefined();
    });

    it('has account actions route defined', () => {
      expect(Routes.SHEET.ACCOUNT_ACTIONS).toBeDefined();
    });

    it('has fiat on testnets friction route defined', () => {
      expect(Routes.SHEET.FIAT_ON_TESTNETS_FRICTION).toBeDefined();
    });

    it('has show ipfs route defined', () => {
      expect(Routes.SHEET.SHOW_IPFS).toBeDefined();
    });

    it('has show nft display media route defined', () => {
      expect(Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA).toBeDefined();
    });

    it('has nft auto detection modal route defined', () => {
      expect(Routes.MODAL.NFT_AUTO_DETECTION_MODAL).toBeDefined();
    });

    it('has whats new route defined', () => {
      expect(Routes.MODAL.WHATS_NEW).toBeDefined();
    });

    it('has multi rpc migration modal route defined', () => {
      expect(Routes.MODAL.MULTI_RPC_MIGRATION_MODAL).toBeDefined();
    });

    it('has show token id route defined', () => {
      expect(Routes.SHEET.SHOW_TOKEN_ID).toBeDefined();
    });

    it('has origin spam modal route defined', () => {
      expect(Routes.SHEET.ORIGIN_SPAM_MODAL).toBeDefined();
    });

    it('has change in simulation modal route defined', () => {
      expect(Routes.SHEET.CHANGE_IN_SIMULATION_MODAL).toBeDefined();
    });

    it('has tooltip modal route defined', () => {
      expect(Routes.SHEET.TOOLTIP_MODAL).toBeDefined();
    });

    it('has deep link modal route defined', () => {
      expect(Routes.MODAL.DEEP_LINK_MODAL).toBeDefined();
    });

    it('has multichain accounts intro route defined', () => {
      expect(Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO).toBeDefined();
    });

    it('has multichain accounts learn more route defined', () => {
      expect(Routes.MODAL.MULTICHAIN_ACCOUNTS_LEARN_MORE).toBeDefined();
    });

    it('has pna25 notice bottom sheet route defined', () => {
      expect(Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET).toBeDefined();
    });

    it('has sdk return to dapp notification route defined', () => {
      expect(Routes.SDK.RETURN_TO_DAPP_NOTIFICATION).toBeDefined();
    });

    it('has card notification route defined', () => {
      expect(Routes.CARD.NOTIFICATION).toBeDefined();
    });

    it('has multichain transaction details route defined', () => {
      expect(Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS).toBeDefined();
    });

    it('has transaction details route defined', () => {
      expect(Routes.SHEET.TRANSACTION_DETAILS).toBeDefined();
    });

    it('has import wallet tip route defined', () => {
      expect(Routes.SHEET.IMPORT_WALLET_TIP).toBeDefined();
    });

    it('has select srp route defined', () => {
      expect(Routes.SHEET.SELECT_SRP).toBeDefined();
    });
  });

  describe('Flow navigators', () => {
    it('has onboarding success flow screens defined', () => {
      expect(Routes.ONBOARDING.SUCCESS).toBeDefined();
      expect(Routes.ONBOARDING.DEFAULT_SETTINGS).toBeDefined();
      expect(Routes.ONBOARDING.GENERAL_SETTINGS).toBeDefined();
      expect(Routes.ONBOARDING.ASSETS_SETTINGS).toBeDefined();
      expect(Routes.ONBOARDING.SECURITY_SETTINGS).toBeDefined();
    });

    it('has vault recovery flow screens defined', () => {
      expect(Routes.VAULT_RECOVERY.RESTORE_WALLET).toBeDefined();
      expect(Routes.VAULT_RECOVERY.WALLET_RESTORED).toBeDefined();
      expect(Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED).toBeDefined();
    });

    it('has detected tokens flow screens defined', () => {
      expect(Routes.SHEET.BASIC_FUNCTIONALITY).toBeDefined();
    });

    it('has multichain account group details screens defined', () => {
      expect(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS).toBeDefined();
      expect(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS).toBeDefined();
    });

    it('has multichain account details action screens defined', () => {
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.ACCOUNT_ACTIONS,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.LEGACY_EDIT_ACCOUNT_NAME,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
      ).toBeDefined();
      expect(
        Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
      ).toBeDefined();
    });
  });

  describe('Import flows', () => {
    it('has import private key routes defined', () => {
      expect(Routes.QR_TAB_SWITCHER).toBeDefined();
    });

    it('has import SRP routes defined', () => {
      expect(Routes.MULTI_SRP.IMPORT).toBeDefined();
    });

    it('has connect QR hardware flow defined', () => {
      expect(Routes.HW.CONNECT).toBeDefined();
    });

    it('has ledger connect flow defined', () => {
      expect(Routes.HW.LEDGER_CONNECT).toBeDefined();
    });
  });

  describe('Modal stacks', () => {
    it('has root modal flow route defined', () => {
      expect(Routes.MODAL.ROOT_MODAL_FLOW).toBeDefined();
    });

    it('has confirmation modal routes defined', () => {
      expect(Routes.CONFIRMATION_REQUEST_MODAL).toBeDefined();
      expect(Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE).toBeDefined();
      expect(Routes.CONFIRMATION_PAY_WITH_MODAL).toBeDefined();
    });

    it('has ledger modal routes defined', () => {
      expect(Routes.LEDGER_TRANSACTION_MODAL).toBeDefined();
      expect(Routes.LEDGER_MESSAGE_SIGN_MODAL).toBeDefined();
    });

    it('has QR signing modal route defined', () => {
      expect(Routes.QR_SIGNING_TRANSACTION_MODAL).toBeDefined();
    });
  });

  describe('Additional sheets and modals', () => {
    it('has security badge bottom sheet route defined', () => {
      expect(Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET).toBeDefined();
    });

    it('has more token actions menu route defined', () => {
      expect(Routes.MODAL.MORE_TOKEN_ACTIONS_MENU).toBeDefined();
    });

    it('has fund action menu route defined', () => {
      expect(Routes.MODAL.FUND_ACTION_MENU).toBeDefined();
    });

    it('has update needed modal route defined', () => {
      expect(Routes.MODAL.UPDATE_NEEDED).toBeDefined();
    });

    it('has OTA updates modal route defined', () => {
      expect(Routes.MODAL.OTA_UPDATES_MODAL).toBeDefined();
    });
  });

  describe('Account management screens', () => {
    it('has account selector route defined', () => {
      expect(Routes.SHEET.ACCOUNT_SELECTOR).toBeDefined();
    });

    it('has address selector route defined', () => {
      expect(Routes.SHEET.ADDRESS_SELECTOR).toBeDefined();
    });

    it('has add account route defined', () => {
      expect(Routes.SHEET.ADD_ACCOUNT).toBeDefined();
    });

    it('has account actions route defined', () => {
      expect(Routes.SHEET.ACCOUNT_ACTIONS).toBeDefined();
    });

    it('has edit account name route defined', () => {
      expect(Routes.EDIT_ACCOUNT_NAME).toBeDefined();
    });

    it('has network selector route defined', () => {
      expect(Routes.SHEET.NETWORK_SELECTOR).toBeDefined();
    });

    it('has network manager route defined', () => {
      expect(Routes.SHEET.NETWORK_MANAGER).toBeDefined();
    });
  });

  describe('Permission screens', () => {
    it('has account connect route defined', () => {
      expect(Routes.SHEET.ACCOUNT_CONNECT).toBeDefined();
    });

    it('has account permissions route defined', () => {
      expect(Routes.SHEET.ACCOUNT_PERMISSIONS).toBeDefined();
    });

    it('has connection details route defined', () => {
      expect(Routes.SHEET.CONNECTION_DETAILS).toBeDefined();
    });

    it('has permitted networks info sheet route defined', () => {
      expect(Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET).toBeDefined();
    });
  });

  describe('SDK screens', () => {
    it('has SDK loading route defined', () => {
      expect(Routes.SHEET.SDK_LOADING).toBeDefined();
    });

    it('has SDK feedback route defined', () => {
      expect(Routes.SHEET.SDK_FEEDBACK).toBeDefined();
    });

    it('has SDK manage connections route defined', () => {
      expect(Routes.SHEET.SDK_MANAGE_CONNECTIONS).toBeDefined();
    });

    it('has SDK disconnect route defined', () => {
      expect(Routes.SHEET.SDK_DISCONNECT).toBeDefined();
    });

    it('has SDK return to dapp notification route defined', () => {
      expect(Routes.SDK.RETURN_TO_DAPP_NOTIFICATION).toBeDefined();
    });
  });

  describe('Settings and preference screens', () => {
    it('has basic functionality route defined', () => {
      expect(Routes.SHEET.BASIC_FUNCTIONALITY).toBeDefined();
    });

    it('has confirm turn on backup and sync route defined', () => {
      expect(Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC).toBeDefined();
    });

    it('has experience enhancer route defined', () => {
      expect(Routes.SHEET.EXPERIENCE_ENHANCER).toBeDefined();
    });

    it('has data collection route defined', () => {
      expect(Routes.SHEET.DATA_COLLECTION).toBeDefined();
    });

    it('has fiat on testnets friction route defined', () => {
      expect(Routes.SHEET.FIAT_ON_TESTNETS_FRICTION).toBeDefined();
    });
  });

  describe('NFT and token screens', () => {
    it('has show IPFS route defined', () => {
      expect(Routes.SHEET.SHOW_IPFS).toBeDefined();
    });

    it('has show NFT display media route defined', () => {
      expect(Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA).toBeDefined();
    });

    it('has NFT auto detection modal route defined', () => {
      expect(Routes.MODAL.NFT_AUTO_DETECTION_MODAL).toBeDefined();
    });

    it('has show token ID route defined', () => {
      expect(Routes.SHEET.SHOW_TOKEN_ID).toBeDefined();
    });

    it('has token sort route defined', () => {
      expect(Routes.SHEET.TOKEN_SORT).toBeDefined();
    });
  });

  describe('Security screens', () => {
    it('has SRP reveal quiz route defined', () => {
      expect(Routes.MODAL.SRP_REVEAL_QUIZ).toBeDefined();
    });

    it('has turn off remember me route defined', () => {
      expect(Routes.MODAL.TURN_OFF_REMEMBER_ME).toBeDefined();
    });

    it('has seedphrase modal route defined', () => {
      expect(Routes.SHEET.SEEDPHRASE_MODAL).toBeDefined();
    });

    it('has skip account security modal route defined', () => {
      expect(Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL).toBeDefined();
    });

    it('has reveal private credential route defined', () => {
      expect(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL).toBeDefined();
    });
  });

  describe('Notification and alert screens', () => {
    it('has origin spam modal route defined', () => {
      expect(Routes.SHEET.ORIGIN_SPAM_MODAL).toBeDefined();
    });

    it('has change in simulation modal route defined', () => {
      expect(Routes.SHEET.CHANGE_IN_SIMULATION_MODAL).toBeDefined();
    });

    it('has ambiguous address route defined', () => {
      expect(Routes.SHEET.AMBIGUOUS_ADDRESS).toBeDefined();
    });

    it('has tooltip modal route defined', () => {
      expect(Routes.SHEET.TOOLTIP_MODAL).toBeDefined();
    });

    it('has whats new route defined', () => {
      expect(Routes.MODAL.WHATS_NEW).toBeDefined();
    });
  });

  describe('Multichain introduction screens', () => {
    it('has multichain accounts intro route defined', () => {
      expect(Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO).toBeDefined();
    });

    it('has multichain accounts learn more route defined', () => {
      expect(Routes.MODAL.MULTICHAIN_ACCOUNTS_LEARN_MORE).toBeDefined();
    });

    it('has PNA25 notice bottom sheet route defined', () => {
      expect(Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET).toBeDefined();
    });
  });

  describe('Transaction screens', () => {
    it('has multichain transaction details route defined', () => {
      expect(Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS).toBeDefined();
    });

    it('has transaction details route defined', () => {
      expect(Routes.SHEET.TRANSACTION_DETAILS).toBeDefined();
    });
  });

  describe('Ramp screens', () => {
    it('has eligibility failed modal route defined', () => {
      expect(Routes.SHEET.ELIGIBILITY_FAILED_MODAL).toBeDefined();
    });

    it('has unsupported region modal route defined', () => {
      expect(Routes.SHEET.UNSUPPORTED_REGION_MODAL).toBeDefined();
    });
  });

  describe('Wallet action screens', () => {
    it('has wallet actions route defined', () => {
      expect(Routes.MODAL.WALLET_ACTIONS).toBeDefined();
    });

    it('has trade wallet actions route defined', () => {
      expect(Routes.MODAL.TRADE_WALLET_ACTIONS).toBeDefined();
    });

    it('has delete wallet route defined', () => {
      expect(Routes.MODAL.DELETE_WALLET).toBeDefined();
    });
  });

  describe('Card screens', () => {
    it('has card notification route defined', () => {
      expect(Routes.CARD.NOTIFICATION).toBeDefined();
    });
  });

  describe('Deep link screens', () => {
    it('has deep link modal route defined', () => {
      expect(Routes.MODAL.DEEP_LINK_MODAL).toBeDefined();
    });
  });

  describe('Options screens', () => {
    it('has options sheet route defined', () => {
      expect(Routes.OPTIONS_SHEET).toBeDefined();
    });
  });

  describe('Browser tabs', () => {
    it('has max browser tabs modal route defined', () => {
      expect(Routes.MODAL.MAX_BROWSER_TABS_MODAL).toBeDefined();
    });
  });

  describe('Network screens', () => {
    it('has add network route defined', () => {
      expect(Routes.ADD_NETWORK).toBeDefined();
    });

    it('has edit network route defined', () => {
      expect(Routes.EDIT_NETWORK).toBeDefined();
    });

    it('has multi RPC migration modal route defined', () => {
      expect(Routes.MODAL.MULTI_RPC_MIGRATION_MODAL).toBeDefined();
    });
  });
});
