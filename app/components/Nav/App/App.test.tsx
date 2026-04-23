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
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
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
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { TraceName, TraceOperation } from '../../../util/trace';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import Logger from '../../../util/Logger';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  settings: {
    basicFunctionalityEnabled: true,
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

jest.mock('../../Views/Onboarding', () => () => (
  <MockView testID="mock-onboarding" />
));
jest.mock('../../Views/ChoosePassword', () => () => (
  <MockView testID="mock-choose-password" />
));
jest.mock('../../Views/ImportFromSecretRecoveryPhrase', () => () => (
  <MockView testID="mock-import-srp" />
));
jest.mock('../../Views/Login', () => () => <MockView testID="mock-login" />);
jest.mock('../../Views/SimpleWebview', () => () => (
  <MockView testID="mock-webview" />
));
jest.mock('../../Views/OnboardingSuccess', () => () => (
  <MockView testID="mock-onboarding-success" />
));
jest.mock('../../Views/OnboardingSuccess/DefaultSettings', () => () => (
  <MockView testID="mock-default-settings" />
));
jest.mock(
  '../../Views/OnboardingSuccess/OnboardingGeneralSettings',
  () => () => <MockView testID="mock-general-settings" />,
);
jest.mock(
  '../../Views/OnboardingSuccess/OnboardingAssetsSettings',
  () => () => <MockView testID="mock-assets-settings" />,
);
jest.mock(
  '../../Views/OnboardingSuccess/OnboardingSecuritySettings',
  () => () => <MockView testID="mock-security-settings" />,
);
jest.mock('../../Views/AccountBackupStep1', () => () => (
  <MockView testID="mock-backup-step1" />
));
jest.mock('../../Views/AccountBackupStep1B', () => () => (
  <MockView testID="mock-backup-step1b" />
));
jest.mock('../../Views/ManualBackupStep1', () => () => (
  <MockView testID="mock-manual-backup-1" />
));
jest.mock('../../Views/ManualBackupStep2', () => () => (
  <MockView testID="mock-manual-backup-2" />
));
jest.mock('../../Views/ManualBackupStep3', () => () => (
  <MockView testID="mock-manual-backup-3" />
));
jest.mock('../../Views/OAuthRehydration', () => () => (
  <MockView testID="mock-oauth" />
));
jest.mock('../../Views/QRTabSwitcher', () => () => (
  <MockView testID="mock-qr-tab" />
));
jest.mock('../../UI/OptinMetrics', () => () => (
  <MockView testID="mock-optin" />
));
jest.mock('../../Views/AccountStatus', () => () => (
  <MockView testID="mock-account-status" />
));
jest.mock('../../Views/SocialLoginIosUser', () => () => (
  <MockView testID="mock-social-login" />
));
jest.mock('../../Views/WalletCreationError', () => () => (
  <MockView testID="mock-wallet-error" />
));
jest.mock('../../Views/ImportPrivateKey', () => () => (
  <MockView testID="mock-import-pk" />
));
jest.mock('../../Views/ImportPrivateKeySuccess', () => () => (
  <MockView testID="mock-import-pk-success" />
));
jest.mock('../../Views/ImportNewSecretRecoveryPhrase', () => () => (
  <MockView testID="mock-import-new-srp" />
));
jest.mock('../../UI/SeedphraseModal', () => () => (
  <MockView testID="mock-seedphrase-modal" />
));
jest.mock('../../Views/ConnectQRHardware', () => () => (
  <MockView testID="mock-qr-hw" />
));
jest.mock('../../Views/LedgerSelectAccount', () => () => (
  <MockView testID="mock-ledger-select" />
));
jest.mock('../../Views/ConnectHardware/SelectHardware', () => () => (
  <MockView testID="mock-select-hw" />
));
jest.mock('../../Views/DetectedTokens', () => () => (
  <MockView testID="mock-detected-tokens" />
));
jest.mock('../../Views/DetectedTokensConfirmation', () => () => (
  <MockView testID="mock-detected-confirm" />
));
jest.mock('../../Views/WalletActions', () => () => (
  <MockView testID="mock-wallet-actions" />
));
jest.mock('../../Views/TradeWalletActions', () => () => (
  <MockView testID="mock-trade-actions" />
));
jest.mock('../../UI/FundActionMenu', () => () => (
  <MockView testID="mock-fund-menu" />
));
jest.mock('../../UI/TokenDetails/components/MoreTokenActionsMenu', () => () => (
  <MockView testID="mock-more-actions" />
));
jest.mock(
  '../../UI/TokenDetails/components/SecurityBadgeBottomSheet',
  () => () => <MockView testID="mock-security-badge" />,
);
jest.mock('../../../components/UI/DeleteWalletModal', () => () => (
  <MockView testID="mock-delete-wallet" />
));
jest.mock('../../../components/Views/AccountActions', () => () => (
  <MockView testID="mock-account-actions" />
));
jest.mock('../../Views/EditAccountName/EditAccountName', () => () => (
  <MockView testID="mock-edit-name" />
));
jest.mock('../../UI/LedgerModals/LedgerMessageSignModal', () => () => (
  <MockView testID="mock-ledger-msg" />
));
jest.mock('../../UI/LedgerModals/LedgerTransactionModal', () => () => (
  <MockView testID="mock-ledger-tx" />
));
jest.mock('../../UI/QRHardware/QRSigningTransactionModal', () => () => (
  <MockView testID="mock-qr-sign" />
));
jest.mock('../../Views/confirmations/components/confirm', () => ({
  Confirm: () => <MockView testID="mock-confirm" />,
}));
jest.mock(
  '../../Views/confirmations/components/modals/switch-account-type-modal',
  () => () => <MockView testID="mock-switch-account" />,
);
jest.mock(
  '../../Views/confirmations/components/modals/pay-with-modal/pay-with-modal',
  () => ({ PayWithModal: () => <MockView testID="mock-pay-with" /> }),
);
jest.mock('../../UI/SelectOptionSheet/OptionsSheet', () => () => (
  <MockView testID="mock-options" />
));
jest.mock('../../Views/NetworksManagement/NetworkDetailsView', () => () => (
  <MockView testID="mock-network-details" />
));
jest.mock('../../Views/LockScreen', () => () => (
  <MockView testID="mock-lock-screen" />
));
jest.mock('../../Views/MultichainAccounts/AddressList', () => ({
  AddressList: () => <MockView testID="mock-address-list" />,
}));
jest.mock('../../Views/MultichainAccounts/PrivateKeyList', () => ({
  PrivateKeyList: () => <MockView testID="mock-pk-list" />,
}));
jest.mock(
  '../../Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions',
  () => () => <MockView testID="mock-mc-actions" />,
);
jest.mock('../../Views/CardNotification', () => () => (
  <MockView testID="mock-card-notification" />
));
jest.mock('../../Views/ReturnToAppNotification', () => () => (
  <MockView testID="mock-return-notif" />
));

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

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();
jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

const mockCheckIsSeedlessPasswordOutdated = jest
  .fn()
  .mockResolvedValue(undefined);
jest.mock('../../../core/', () => ({
  Authentication: {
    checkIsSeedlessPasswordOutdated: (...args: unknown[]) =>
      mockCheckIsSeedlessPasswordOutdated(...args),
  },
}));

jest.mock('../../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(),
}));

jest.mock('../../../util/networks/isNetworkUiRedesignEnabled', () => ({
  isNetworkUiRedesignEnabled: jest.fn().mockReturnValue(true),
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
  getBuildNumber: jest.fn().mockReturnValue('100'),
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

  describe('Performance tracing', () => {
    const renderApp = () => {
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

      return render(<App />, { wrapper: Providers });
    };

    it('calls trace with NavInit on first render', () => {
      renderApp();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.NavInit,
          op: TraceOperation.NavInit,
        }),
      );
    });

    it('calls endTrace with UIStartup after mount', async () => {
      renderApp();

      await waitFor(() => {
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: TraceName.UIStartup,
        });
      });
    });
  });

  describe('Version handling - detailed branches', () => {
    const renderAppWithExistingUser = (existingUser: boolean) => {
      const mockStore = configureMockStore();
      const state: DeepPartial<RootState> = {
        ...initialState,
        user: {
          ...initialState.user,
          existingUser,
        },
      };
      const store = mockStore(state);

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

    it('saves last and current version when currentVersion differs from savedVersion', async () => {
      const setItemSpy = jest
        .spyOn(StorageWrapper, 'setItem')
        .mockResolvedValue();
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) return '0.9.0';
        if (key === LAST_APP_VERSION) return '0.8.0';
        return null;
      });

      renderAppWithExistingUser(false);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(LAST_APP_VERSION, '0.9.0');
        expect(setItemSpy).toHaveBeenCalledWith(CURRENT_APP_VERSION, '1.0.0');
      });

      setItemSpy.mockRestore();
    });

    it('saves only current version when savedVersion is null', async () => {
      const setItemSpy = jest
        .spyOn(StorageWrapper, 'setItem')
        .mockResolvedValue();
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) return null;
        if (key === LAST_APP_VERSION) return null;
        return null;
      });

      renderAppWithExistingUser(false);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(CURRENT_APP_VERSION, '1.0.0');
        expect(setItemSpy).toHaveBeenCalledWith(LAST_APP_VERSION, '1.0.0');
      });

      setItemSpy.mockRestore();
    });

    it('sets lastVersion to 0.0.1 when existingUser is true and lastVersion is missing', async () => {
      const setItemSpy = jest
        .spyOn(StorageWrapper, 'setItem')
        .mockResolvedValue();
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) return '1.0.0';
        if (key === LAST_APP_VERSION) return null;
        return null;
      });

      renderAppWithExistingUser(true);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(LAST_APP_VERSION, '0.0.1');
      });

      setItemSpy.mockRestore();
    });

    it('sets lastVersion to currentVersion when existingUser is false and lastVersion is missing', async () => {
      const setItemSpy = jest
        .spyOn(StorageWrapper, 'setItem')
        .mockResolvedValue();
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) return '1.0.0';
        if (key === LAST_APP_VERSION) return null;
        return null;
      });

      renderAppWithExistingUser(false);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(LAST_APP_VERSION, '1.0.0');
      });

      setItemSpy.mockRestore();
    });

    it('does not overwrite versions when currentVersion matches savedVersion', async () => {
      const setItemSpy = jest
        .spyOn(StorageWrapper, 'setItem')
        .mockResolvedValue();
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) return '1.0.0';
        if (key === LAST_APP_VERSION) return '0.9.0';
        return null;
      });

      renderAppWithExistingUser(false);

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalled();
      });

      expect(setItemSpy).not.toHaveBeenCalledWith(
        CURRENT_APP_VERSION,
        expect.anything(),
      );
      expect(setItemSpy).not.toHaveBeenCalledWith(
        LAST_APP_VERSION,
        expect.anything(),
      );

      setItemSpy.mockRestore();
    });
  });

  describe('Seedless password check interval', () => {
    beforeEach(() => {
      mockCheckIsSeedlessPasswordOutdated
        .mockReset()
        .mockResolvedValue(undefined);
    });

    const renderAppWithSeedlessState = (isSeedless: boolean) => {
      (
        selectSeedlessOnboardingLoginFlow as unknown as jest.Mock
      ).mockReturnValue(isSeedless);

      const mockStore = configureMockStore();
      const state: DeepPartial<RootState> = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine?.backgroundState,
          },
        },
      };
      const store = mockStore(state);

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

    it('calls checkIsSeedlessPasswordOutdated when isSeedlessOnboardingLoginFlow is true', async () => {
      renderAppWithSeedlessState(true);

      jest.advanceTimersByTime(0);

      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(
          expect.objectContaining({
            skipCache: true,
            captureSentryError: false,
          }),
        );
      });
    });

    it('does not call checkIsSeedlessPasswordOutdated when isSeedlessOnboardingLoginFlow is false', async () => {
      renderAppWithSeedlessState(false);

      jest.advanceTimersByTime(0);

      await waitFor(() => {
        expect(mockCheckIsSeedlessPasswordOutdated).not.toHaveBeenCalled();
      });
    });

    it('logs error when checkIsSeedlessPasswordOutdated rejects', async () => {
      const testError = new Error('seedless check failed');
      mockCheckIsSeedlessPasswordOutdated.mockRejectedValueOnce(testError);

      renderAppWithSeedlessState(true);

      jest.advanceTimersByTime(0);

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          testError,
          'App: Error in checkIsSeedlessPasswordOutdated',
        );
      });
    });
  });

  describe('Rendered component structure', () => {
    const renderApp = () => {
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

      return render(<App />, { wrapper: Providers });
    };

    it('renders without crashing', () => {
      const { toJSON } = renderApp();
      expect(toJSON()).toBeTruthy();
    });

    it('renders the FoxLoader as default initial route', async () => {
      const { getByTestId } = renderApp();

      await waitFor(() => {
        expect(getByTestId(MOCK_FOX_LOADER_ID)).toBeTruthy();
      });
    });
  });

  describe('Sub-navigator rendering', () => {
    const renderAppAtRoute = (
      routeState: PartialState<NavigationState>,
      state: DeepPartial<RootState> = initialState,
    ) => {
      const mockStore = configureMockStore();
      const store = mockStore(state);

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

    it('renders OnboardingRootNav with nested OnboardingNav', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: 'OnboardingRootNav',
            state: {
              index: 0,
              routes: [
                {
                  name: 'OnboardingNav',
                  state: {
                    index: 0,
                    routes: [{ name: 'Onboarding' }],
                  },
                },
              ],
            },
          },
        ],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-onboarding')).toBeTruthy();
      });
    });

    it('renders VaultRecoveryFlow', async () => {
      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.VAULT_RECOVERY.RESTORE_WALLET,
          },
        ],
      };

      const { toJSON } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders ImportPrivateKeyView flow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: 'ImportPrivateKeyView' }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-import-pk')).toBeTruthy();
      });
    });

    it('renders ImportSRPView flow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: 'ImportSRPView' }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-import-new-srp')).toBeTruthy();
      });
    });

    it('renders ConnectQRHardwareFlow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: 'ConnectQRHardwareFlow' }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-qr-hw')).toBeTruthy();
      });
    });

    it('renders LedgerConnectFlow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.HW.CONNECT_LEDGER }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-ledger-select')).toBeTruthy();
      });
    });

    it('renders ConnectHardwareWalletFlow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.HW.CONNECT }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-select-hw')).toBeTruthy();
      });
    });

    it('renders the Login screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-login')).toBeTruthy();
      });
    });

    it('renders the OnboardingSuccessFlow', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.ONBOARDING.SUCCESS_FLOW }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-onboarding-success')).toBeTruthy();
      });
    });

    it('renders the ConfirmationRequestModal', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.CONFIRMATION_REQUEST_MODAL }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-confirm')).toBeTruthy();
      });
    });

    it('renders the LedgerTransactionModal', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.LEDGER_TRANSACTION_MODAL }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-ledger-tx')).toBeTruthy();
      });
    });

    it('renders the QRSigningTransactionModal', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.QR_SIGNING_TRANSACTION_MODAL }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-qr-sign')).toBeTruthy();
      });
    });

    it('renders the LedgerMessageSignModal', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.LEDGER_MESSAGE_SIGN_MODAL }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-ledger-msg')).toBeTruthy();
      });
    });

    it('renders the EditAccountName screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.EDIT_ACCOUNT_NAME }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-edit-name')).toBeTruthy();
      });
    });

    it('renders the AddNetworkFlow screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.ADD_NETWORK }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-network-details')).toBeTruthy();
      });
    });

    it('renders the OptionsSheet screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.OPTIONS_SHEET }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-options')).toBeTruthy();
      });
    });

    it('renders the MultichainAccountCellActions screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_CELL_ACTIONS }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-mc-actions')).toBeTruthy();
      });
    });

    it('renders the MaxBrowserTabsModal screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.MODAL.MAX_BROWSER_TABS_MODAL }],
      };

      const { toJSON } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders the ConfirmationSwitchAccountType screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-switch-account')).toBeTruthy();
      });
    });

    it('renders the ConfirmationPayWithModal screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.CONFIRMATION_PAY_WITH_MODAL }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-pay-with')).toBeTruthy();
      });
    });

    it('renders the RevealPrivateCredential screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL }],
      };

      const { toJSON } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders the MultichainAddressList screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-address-list')).toBeTruthy();
      });
    });

    it('renders the MultichainPrivateKeyList screen', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-pk-list')).toBeTruthy();
      });
    });

    it('renders the LockScreen route', async () => {
      const routeState = {
        index: 0,
        routes: [{ name: Routes.LOCK_SCREEN }],
      };

      const { getByTestId } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(getByTestId('mock-lock-screen')).toBeTruthy();
      });
    });
  });

  describe('isNetworkUiRedesignEnabled conditional rendering', () => {
    const renderAppAtRoute = (routeState: PartialState<NavigationState>) => {
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

    it('renders EditNetwork screen when isNetworkUiRedesignEnabled returns true', async () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockReturnValue(true);

      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.EDIT_NETWORK,
          },
        ],
      };

      const { toJSON } = renderAppAtRoute(routeState);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('calls isNetworkUiRedesignEnabled during rendering', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockReturnValue(false);

      const routeState = {
        index: 0,
        routes: [{ name: Routes.FOX_LOADER }],
      };

      renderAppAtRoute(routeState);

      expect(isNetworkUiRedesignEnabled).toHaveBeenCalled();
    });
  });

  describe('RootModalFlow screens rendering', () => {
    const renderAppWithModal = (
      modalScreen: string,
      params?: Record<string, unknown>,
    ) => {
      const mockStore = configureMockStore();
      const store = mockStore(initialState);

      const routeState = {
        index: 0,
        routes: [
          {
            name: Routes.MODAL.ROOT_MODAL_FLOW,
            params: {
              screen: modalScreen,
              ...(params ? { params } : {}),
            },
          },
        ],
      };

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

    it('renders UpdateNeeded modal', async () => {
      const { toJSON } = renderAppWithModal(Routes.MODAL.UPDATE_NEEDED);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders TokenSort sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.TOKEN_SORT);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders BasicFunctionality sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.BASIC_FUNCTIONALITY);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders NetworkSelector sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.NETWORK_SELECTOR);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders SDKLoading sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.SDK_LOADING);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders ShowIpfs sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.SHOW_IPFS);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders ShowNftDisplayMedia sheet', async () => {
      const { toJSON } = renderAppWithModal(
        Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
      );

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders WhatsNew modal', async () => {
      const { toJSON } = renderAppWithModal(Routes.MODAL.WHATS_NEW);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders TooltipModal sheet', async () => {
      const { toJSON } = renderAppWithModal(Routes.SHEET.TOOLTIP_MODAL);

      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders WalletActions modal', async () => {
      const { getByTestId } = renderAppWithModal(Routes.MODAL.WALLET_ACTIONS);

      await waitFor(() => {
        expect(getByTestId('mock-wallet-actions')).toBeTruthy();
      });
    });

    it('renders DeleteWallet modal', async () => {
      const { getByTestId } = renderAppWithModal(Routes.MODAL.DELETE_WALLET);

      await waitFor(() => {
        expect(getByTestId('mock-delete-wallet')).toBeTruthy();
      });
    });

    it('renders AccountActions sheet', async () => {
      const { getByTestId } = renderAppWithModal(Routes.SHEET.ACCOUNT_ACTIONS);

      await waitFor(() => {
        expect(getByTestId('mock-account-actions')).toBeTruthy();
      });
    });

    it('renders FundActionMenu modal', async () => {
      const { getByTestId } = renderAppWithModal(Routes.MODAL.FUND_ACTION_MENU);

      await waitFor(() => {
        expect(getByTestId('mock-fund-menu')).toBeTruthy();
      });
    });

    it('renders TradeWalletActions modal', async () => {
      const { getByTestId } = renderAppWithModal(
        Routes.MODAL.TRADE_WALLET_ACTIONS,
      );

      await waitFor(() => {
        expect(getByTestId('mock-trade-actions')).toBeTruthy();
      });
    });

    it('renders DetectedTokens flow', async () => {
      const { getByTestId } = renderAppWithModal('DetectedTokens');

      await waitFor(() => {
        expect(getByTestId('mock-detected-tokens')).toBeTruthy();
      });
    });
  });
});
