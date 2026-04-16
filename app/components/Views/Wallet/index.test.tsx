import React from 'react';
import type { Json } from '@metamask/utils';

// Import StorageWrapper mock from global testSetup - this provides StorageWrapper.getItem
import StorageWrapper from '../../../store/storage-wrapper';

// Local mocks specific to this test file to avoid affecting other tests
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
  getApplicationName: jest.fn(() => 'MetaMask'),
  getBuildNumber: jest.fn(() => '1234'),
  getSystemVersion: jest.fn(() => '17.0'),
  getTotalMemorySync: jest.fn(() => 4000000000),
}));

// Mock components BEFORE importing the main component
jest.mock('../AssetDetails/AssetDetailsActions', () => ({
  __esModule: true,
  default: jest.fn((_props) => null),
}));

// Mock NFT auto detection modal hook to prevent interference with navigation tests
jest.mock('../../hooks/useCheckNftAutoDetectionModal', () =>
  jest.fn(() => {
    // Hook implementation mocked to prevent modal interference
  }),
);

// Mock PerpsTabView
jest.mock('../../UI/Perps/Views/PerpsTabView', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

// Mock PredictTabView
jest.mock('../../UI/Predict/views/PredictTabView', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../../UI/Assets/components/Balance/AccountGroupBalance', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

// Tokens triggers asset selector errors with this file's Redux mock; stub so sibling tab mocks can mount
jest.mock('../../UI/Tokens', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactMock.forwardRef((_props: unknown, _ref: unknown) =>
      ReactMock.createElement(View, { testID: 'wallet-tokens-tab-mock' }),
    ),
  };
});

// Mock remoteFeatureFlag util to ensure version check passes
jest.mock('../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
  validatedVersionGatedFeatureFlag: jest.fn(() => false),
}));

// Note: BIP-44 multichain accounts is now the default behavior

// Mock the Perps feature flag selector - will be controlled per test
let mockPerpsEnabled = true;
let mockPerpsGTMModalEnabled = false;
jest.mock('../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn(() => mockPerpsEnabled),
  selectPerpsServiceInterruptionBannerEnabledFlag: jest.fn(() => false),
  selectPerpsGtmOnboardingModalEnabledFlag: jest.fn(
    () => mockPerpsGTMModalEnabled,
  ),
}));

// Mock the Predict feature flag selector - will be controlled per test
let mockPredictEnabled = true;
let mockPredictGTMModalEnabled = false;
jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => mockPredictEnabled),
  selectPredictGtmOnboardingModalEnabledFlag: jest.fn(
    () => mockPredictGTMModalEnabled,
  ),
}));

// Control homepage feature flags per test (default false so existing tests are unaffected)
let mockHomepageSectionsEnabled = false;
jest.mock('../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => false),
  selectHomepageSectionsV1Enabled: jest.fn(() => mockHomepageSectionsEnabled),
}));

// Capture the HomepageScrollContext value by rendering a context-aware mock Homepage.
// The mock is only invoked when mockHomepageSectionsEnabled=true (sections flag on),
// so existing tests that leave the flag false are completely unaffected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedContext: any = null;
jest.mock('../Homepage', () => {
  const React = jest.requireActual('react');
  const { HomepageScrollContext: HomepageCtx } = jest.requireActual(
    '../Homepage/context/HomepageScrollContext',
  );
  return {
    __esModule: true,
    default: React.forwardRef((_props: unknown, _ref: unknown) => {
      capturedContext = React.useContext(HomepageCtx);
      return null;
    }),
  };
});

// Create shared mock reference for TabsList
let mockTabsListComponent: jest.Mock;

jest.mock('../../../component-library/components-temp/Tabs', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const renderFn = jest.fn();

  // Store reference for tests
  mockTabsListComponent = renderFn;

  const TabsList = ReactMock.forwardRef(
    (props: TabsListProps, _ref: unknown) => {
      renderFn(props);
      return ReactMock.createElement(View, null, props.children);
    },
  );

  return {
    __esModule: true,
    TabsList,
    TabsListRef: {},
  };
});

import Wallet, { useHomeDeepLinkEffects } from './';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { renderHook } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  createMockInternalAccount,
} from '../../../util/test/accountsControllerTestUtils';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { mockedPerpsFeatureFlagsEnabledState } from '../../UI/Perps/mocks/remoteFeatureFlagMocks';
import { initialState as cardInitialState } from '../../../core/redux/slices/card';
import { initialState as networkConnectionBannerInitialState } from '../../../reducers/networkConnectionBanner';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';
import { TabsListProps } from '../../../component-library/components-temp/Tabs';

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const getAssetDetailsActionsProps = () => {
  const mockAssetDetailsActions = jest.mocked(
    jest.requireMock('../AssetDetails/AssetDetailsActions').default,
  );
  const props = mockAssetDetailsActions.mock.calls.at(-1)?.[0];
  if (!props) {
    throw new Error('Expected AssetDetailsActions to render');
  }
  return props as {
    onReceive: () => void;
    onSend: () => Promise<void>;
    goToSwaps: () => void;
    displayBuyButton: boolean;
    displaySwapsButton: boolean;
    buyButtonActionID: string;
    swapButtonActionID: string;
    sendButtonActionID: string;
    receiveButtonActionID: string;
    onBuy?: () => void;
  };
};

jest.mock('../../../util/address', () => {
  const actual = jest.requireActual('../../../util/address');
  return {
    ...actual,
    getLabelTextByAddress: jest.fn(),
  };
});

jest.mock('../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: MockAccountsState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');

  const startPolling = jest.fn();
  const stopPollingByPollingToken = jest.fn();

  return {
    getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
      totalNativeTokenBalance: { amount: '1', unit: 'ETH' },
      totalBalanceFiat: 3200,
      balances: {
        '0x0': { amount: '1', unit: 'ETH' },
      },
    }),
    context: {
      NftController: {
        state: {
          allNfts: {
            [MOCK_ADDRESS]: {
              [MOCK_ADDRESS]: [],
            },
          },
          allNftContracts: {
            [MOCK_ADDRESS]: {
              [MOCK_ADDRESS]: [],
            },
          },
        },
        allNfts: {
          [MOCK_ADDRESS]: {
            [MOCK_ADDRESS]: [],
          },
        },
        allNftContracts: {
          [MOCK_ADDRESS]: {
            [MOCK_ADDRESS]: [],
          },
        },
      },
      CurrencyRateController: {
        startPolling,
        stopPollingByPollingToken,
      },
      TokenRatesController: {
        poll: jest.fn(),
        startPolling,
        stopPollingByPollingToken,
      },
      TokenDetectionController: {
        detectTokens: jest.fn(),
        startPolling,
        stopPollingByPollingToken,
      },
      TokenListController: {
        startPolling,
        stopPollingByPollingToken,
      },
      TokenBalancesController: {
        startPolling,
        stopPollingByPollingToken,
      },
      MultichainAssetsRatesController: {
        startPolling,
        stopPollingByPollingToken,
      },
      NftDetectionController: {
        detectNfts: jest.fn(),
      },
      AccountTrackerController: {
        refresh: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
              type: KeyringTypes.hd,
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...MockAccountsState,
        state: MockAccountsState,
      },
      PreferencesController: {
        setTokenNetworkFilter: jest.fn(),
      },
      TokensController: {
        addTokens: jest.fn(),
      },
      NetworkEnablementController: {
        setEnabledNetwork: jest.fn(),
        setDisabledNetwork: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: jest.fn(),
        listPopularEvmNetworks: jest.fn(() => ['0x1']),
        listPopularMultichainNetworks: jest.fn(() => []),
        listPopularNetworks: jest.fn(() => []),
      },
      PerpsController: {
        startMarketDataPreload: jest.fn(),
        stopMarketDataPreload: jest.fn(),
      },
    },
  };
});

jest.mock('../../../core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      };
    },
    get controllerMessenger() {
      return {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };
    },
  },
}));

const mockInitialState = {
  user: {
    isConnectionRemoved: false,
  },
  networkOnboarded: {
    networkOnboardedState: {
      '0x1': true,
    },
  },
  security: {
    dataCollectionForMarketing: true,
  },
  swaps: {
    [MOCK_ADDRESS]: { isLive: true },
    hasOnboarded: false,
    isLive: true,
  },
  card: cardInitialState,
  settings: {
    primaryCurrency: 'usd',
    basicFunctionalityEnabled: true,
    useTokenDetection: true,
  },
  fiatOrders: {
    networks: [],
  },
  browser: {
    tabs: [],
  },
  metamask: {
    isDataCollectionForMarketingEnabled: true,
  },
  rewards: {
    candidateSubscriptionId: null,
    hideUnlinkedAccountsBanner: false,
    seasonStatusError: null,
  },
  multichain: {
    dismissedBanners: [], // Added missing property
  },
  onboarding: {
    completedOnboarding: true,
  },
  legalNotices: {
    isPna25Acknowledged: false,
    newPrivacyPolicyToastShownDate: null,
    newPrivacyPolicyToastClickedOrClosed: false,
  },
  networkConnectionBanner: networkConnectionBannerInitialState,
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bridgeConfigV2: {
            support: true,
            chains: {
              'eip155:1': {
                isActiveSrc: true,
                isActiveDest: true,
                isUnifiedUIEnabled: false,
              },
            },
          },
        },
      },
      TokensController: {
        ...backgroundState.TokensController,
        detectedTokens: [{ address: '0x123' }],
        allDetectedTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [
              { address: '0x123' },
            ],
          },
        },
      },
      RewardsController: {
        activeAccount: null,
      },
      PreferencesController: {
        useTokenDetection: true,
        isTokenNetworkFilterEqualToAllNetworks: false,
        tokenNetworkFilter: {
          '0x1': true, // Ethereum mainnet enabled
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        providerConfig: {
          chainId: '0x1',
          type: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        },
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as `0x${string}`,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            blockExplorerUrls: [],
          },
        },
      },
      KeyringController: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: [MOCK_ADDRESS],
          },
        ],
      },
      NotificationServicesController: {
        isNotificationServicesEnabled: false,
        isMetamaskNotificationsEnabled: false,
        metamaskNotificationsList: [],
        metamaskNotificationsReadList: [],
      },
    },
  },
};

/** Keeps AccountsController / PreferencesController from mockInitialState while merging remote flags. */
function mockInitialStateWithRemoteFeatureFlags(
  remoteFeatureFlagOverrides: Record<string, Json>,
) {
  const remote =
    mockInitialState.engine.backgroundState.RemoteFeatureFlagController;
  const baseFlags = remote.remoteFeatureFlags;
  return {
    ...mockInitialState,
    engine: {
      ...mockInitialState.engine,
      backgroundState: {
        ...mockInitialState.engine.backgroundState,
        RemoteFeatureFlagController: {
          ...remote,
          remoteFeatureFlags: {
            ...baseFlags,
            ...remoteFeatureFlagOverrides,
          },
        },
      },
    },
  };
}

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: jest.fn().mockReturnValue({
    address: MOCK_ADDRESS,
    balance: '0x0',
    name: 'Account 1',
    type: 'default',
    metadata: {
      keyring: {
        type: 'HD Key Tree',
      },
    },
  }),
}));

// Better navigation mock pattern (from WalletActions.test.tsx)
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

// Mock core first so useIsFocused/useNavigation work when Wallet or children use them
jest.mock('@react-navigation/core', () => {
  const actualCore = jest.requireActual('@react-navigation/core');
  return {
    ...actualCore,
    useNavigation: jest.fn(() => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      addListener: jest.fn(() => jest.fn()),
      isFocused: () => true,
      dangerouslyGetParent: jest.fn(),
    })),
    useIsFocused: jest.fn(() => true),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(() => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      addListener: jest.fn(() => jest.fn()),
      isFocused: jest.fn(() => false),
      dangerouslyGetParent: jest.fn(() => ({
        dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
        addListener: jest.fn(() => jest.fn()),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => undefined),
        })),
      })),
    })),
    useRoute: jest.fn(() => ({
      params: {},
    })),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
  };
});

const render = (Component: React.ComponentType) =>
  renderScreen(
    Component,
    {
      name: Routes.WALLET_VIEW,
    },
    {
      state: mockInitialState,
    },
  );

/** Provider preloaded state must match useSelector mock implementation for connected Wallet. */
const renderWalletWithRootState = (rootState: typeof mockInitialState) =>
  renderScreen(
    // @ts-expect-error navigation params intentionally omitted (same as render(Wallet))
    Wallet,
    {
      name: Routes.WALLET_VIEW,
    },
    {
      state: rootState,
    },
  );

const renderWithoutDetectedTokens = (Component: React.ComponentType) =>
  renderScreen(
    Component,
    {
      name: Routes.WALLET_VIEW,
    },
    {
      state: {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              ...mockInitialState.engine.backgroundState.TokensController,
              // @ts-expect-error we are testing the invalid case
              detectedTokens: 'invalid-array',
            },
          },
        },
      },
    },
  );

describe('Wallet', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    jest
      .mocked(useSelector)
      .mockImplementation((callback: (state: unknown) => unknown) =>
        callback(mockInitialState),
      );
  });

  it('should render correctly', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    const wrapper = render(Wallet);
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should render correctly when there are no detected tokens', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    const wrapper = renderWithoutDetectedTokens(Wallet);
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should render TabsList', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);

    // Check if TabsList mock was called
    expect(mockTabsListComponent).toHaveBeenCalled();
  });

  it('Should add tokens to state automatically when there are detected tokens', () => {
    const mockedAddTokens = jest.mocked(Engine.context.TokensController);

    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);

    expect(mockedAddTokens.addTokens).toHaveBeenCalledTimes(1);
  });

  it('should render correctly when Solana support is enabled', () => {
    jest
      .mocked(useSelector)
      .mockImplementation((callback: (state: unknown) => unknown) =>
        callback(mockInitialState),
      );
    //@ts-expect-error we are ignoring the navigation params on purpose
    const wrapper = render(Wallet);
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('calls AccountTrackerController.refresh when selectedInternalAccount changes', async () => {
    const refreshMock = jest.mocked(
      Engine.context.AccountTrackerController.refresh,
    );

    //@ts-expect-error we are ignoring the navigation params on purpose
    render(Wallet);
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    refreshMock.mockClear();

    renderScreen(
      // @ts-expect-error we are ignoring the navigation params on purpose
      Wallet,
      { name: Routes.WALLET_VIEW },
      {
        state: {
          ...mockInitialState,
          engine: {
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              AccountsController: {
                ...mockInitialState.engine.backgroundState.AccountsController,
                internalAccounts: {
                  ...mockInitialState.engine.backgroundState.AccountsController
                    .internalAccounts,
                  selectedAccount: 'different-account-id',
                },
              },
            },
          },
        },
      },
    );

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  describe('AssetDetailsActions', () => {
    const mockAssetDetailsActions = jest.mocked(
      jest.requireMock('../AssetDetails/AssetDetailsActions').default,
    );

    beforeEach(() => {
      mockAssetDetailsActions.mockClear();
      mockNavigate.mockClear();
    });

    it('passes required props to AssetDetailsActions', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      expect(getAssetDetailsActionsProps()).toMatchObject({
        displayBuyButton: expect.any(Boolean),
        displaySwapsButton: expect.any(Boolean),
        goToSwaps: expect.any(Function),
        onReceive: expect.any(Function),
        onSend: expect.any(Function),
        buyButtonActionID: 'wallet-buy-button',
        swapButtonActionID: 'wallet-swap-button',
        sendButtonActionID: 'wallet-send-button',
        receiveButtonActionID: 'wallet-receive-button',
      });
    });

    it('navigates to the multichain address list when onReceive is invoked', () => {
      const receiveAccount = createMockInternalAccount(
        '0x1234567890123456789012345678901234567890',
        'Receive Test Account',
      );
      const mockStateWithReceiveData = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountsController: {
              ...mockInitialState.engine.backgroundState.AccountsController,
              internalAccounts: {
                accounts: {
                  [receiveAccount.id]: receiveAccount,
                },
                selectedAccount: receiveAccount.id,
              },
            },
            AccountTreeController: {
              accountTree: { wallets: {} },
              selectedAccountGroup: 'keyring:wallet-1/ethereum',
            },
            NetworkController: {
              ...mockInitialState.engine.backgroundState.NetworkController,
              providerConfig: {
                ...mockInitialState.engine.backgroundState.NetworkController
                  .providerConfig,
                nickname: 'Ethereum Mainnet',
                chainId: '0x1',
              },
            },
          },
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback) => callback(mockStateWithReceiveData));

      //@ts-expect-error we are ignoring the navigation params on purpose
      renderWalletWithRootState(mockStateWithReceiveData);
      getAssetDetailsActionsProps().onReceive();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
        expect.objectContaining({
          groupId: expect.any(String),
          title: expect.any(String),
        }),
      );
    });

    it('navigates via createAddressListNavigationDetails when account group is selected', () => {
      const mockStateWithMultichainAccounts = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountTreeController: {
              accountTree: { wallets: {} },
              selectedAccountGroup: 'keyring:wallet-1/ethereum',
            },
          },
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(mockStateWithMultichainAccounts),
        );

      //@ts-expect-error we are ignoring the navigation params on purpose
      renderWalletWithRootState(mockStateWithMultichainAccounts);
      getAssetDetailsActionsProps().onReceive();

      expect(mockNavigate).toHaveBeenCalled();
      const [route, params] = mockNavigate.mock.calls[0];
      expect(route).toBeDefined();
      expect(params).toBeDefined();
    });

    it('opens Send flow from onSend when native ticker is set', async () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      await getAssetDetailsActionsProps().onSend();

      const sendNavigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'Send',
      );
      expect(sendNavigationCall).toBeDefined();
    });

    it('opens Send flow from onSend when native ticker is missing', async () => {
      const stateWithoutNativeCurrency = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            NetworkController: {
              ...mockInitialState.engine.backgroundState.NetworkController,
              providerConfig: {
                ...mockInitialState.engine.backgroundState.NetworkController
                  .providerConfig,
                ticker: undefined, // Remove native currency
              },
            },
          },
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(stateWithoutNativeCurrency),
        );

      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      await getAssetDetailsActionsProps().onSend();

      const sendNavigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'Send',
      );
      expect(sendNavigationCall).toBeDefined();
    });

    it('omits onBuy while still passing buyButtonActionID', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const passedProps = getAssetDetailsActionsProps();
      expect(passedProps.onBuy).toBeUndefined();
      expect(passedProps.buyButtonActionID).toBeDefined();
    });

    it('passes goToSwaps as a function', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      expect(typeof getAssetDetailsActionsProps().goToSwaps).toBe('function');
    });
  });

  // Conditional Rendering Tests
  describe('Conditional Rendering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render banner when basic functionality is disabled', () => {
      const stateWithDisabledBasicFunctionality = {
        ...mockInitialState,
        settings: {
          ...mockInitialState.settings,
          basicFunctionalityEnabled: false,
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(stateWithDisabledBasicFunctionality),
        );

      //@ts-expect-error we are ignoring the navigation params on purpose
      const wrapper = render(Wallet);
      expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render loader when no selected account', () => {
      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) => {
          const selectorString = callback.toString();
          if (selectorString.includes('selectSelectedInternalAccount')) {
            return null; // No selected account
          }
          return callback(mockInitialState);
        });

      //@ts-expect-error we are ignoring the navigation params on purpose
      const wrapper = render(Wallet);
      expect(wrapper.toJSON()).toMatchSnapshot();
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Suppress console.error for these tests since we're testing error scenarios
      jest.spyOn(console, 'error').mockImplementation(jest.fn());
      jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('still opens Send when trackActionButtonClick throws', async () => {
      const actionButtonTracking = jest.requireActual<
        typeof import('../../../util/analytics/actionButtonTracking')
      >('../../../util/analytics/actionButtonTracking');
      const spy = jest
        .spyOn(actionButtonTracking, 'trackActionButtonClick')
        .mockImplementation(() => {
          throw new Error('Transaction initialization failed');
        });
      try {
        //@ts-expect-error we are ignoring the navigation params on purpose
        render(Wallet);
        await getAssetDetailsActionsProps().onSend();
        expect(mockNavigate.mock.calls.some((call) => call[0] === 'Send')).toBe(
          true,
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('Connection Removed', () => {
    it('connection removed modal is not shown when isConnectionRemoved is true', () => {
      const mockInitialStateWithConnectionRemoved = {
        ...mockInitialState,
        user: {
          isConnectionRemoved: true,
        },
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            PreferencesController: {
              ...mockInitialState.engine.backgroundState.PreferencesController,
              useNftDetection: true,
            },
          },
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(mockInitialStateWithConnectionRemoved),
        );

      // Create a complete navigation object mock
      const mockNavigationObject = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => false),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => ({
            dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
            addListener: jest.fn(() => jest.fn()),
            dangerouslyGetParent: jest.fn(() => undefined),
          })),
        })),
      } as unknown as NavigationProp<ParamListBase>;

      // Clear previous calls
      mockNavigate.mockClear();

      renderWithProvider(
        <Wallet
          navigation={mockNavigationObject}
          currentRouteName={Routes.WALLET_VIEW}
        />,
        {
          state: mockInitialStateWithConnectionRemoved,
        },
      );

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: expect.any(String),
            description: expect.any(String),
            primaryButtonLabel: expect.any(String),
            type: 'error',
            icon: IconName.Danger,
            iconColor: IconColor.Warning,
            isInteractable: false,
            closeOnPrimaryButtonPress: true,
            onPrimaryButtonPress: expect.any(Function),
          }),
        },
      );

      jest.clearAllMocks();
    });

    it('connection removed modal is shown when isConnectionRemoved is true and isSocialLogin is true', () => {
      const mockInitialStateWithConnectionRemoved = {
        ...mockInitialState,
        user: {
          isConnectionRemoved: true,
        },
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            PreferencesController: {
              ...mockInitialState.engine.backgroundState.PreferencesController,
              useNftDetection: true,
            },
            SeedlessOnboardingController: {
              ...mockInitialState.engine.backgroundState
                .SeedlessOnboardingController,
              vault: 'encrypted-vault-data',
              loginFlow: true,
            },
          },
        },
      };

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(mockInitialStateWithConnectionRemoved),
        );

      // Create a complete navigation object mock
      const mockNavigationObject = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => false),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => ({
            dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
            addListener: jest.fn(() => jest.fn()),
            dangerouslyGetParent: jest.fn(() => undefined),
          })),
        })),
      } as unknown as NavigationProp<ParamListBase>;

      // Clear previous calls
      mockNavigate.mockClear();

      renderWithProvider(
        <Wallet
          navigation={mockNavigationObject}
          currentRouteName={Routes.WALLET_VIEW}
        />,
        {
          state: mockInitialStateWithConnectionRemoved,
        },
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          primaryButtonLabel: expect.any(String),
          type: 'error',
          icon: IconName.Danger,
          iconColor: IconColor.Warning,
          isInteractable: false,
          closeOnPrimaryButtonPress: true,
          onPrimaryButtonPress: expect.any(Function),
        }),
      });

      jest.clearAllMocks();
    });
  });

  describe('Perps Tab Visibility', () => {
    let mockPerpsTabView: jest.Mock;
    let mockNavigation: NavigationProp<ParamListBase>;

    beforeEach(() => {
      // Get the actual mock that was created at the top
      mockPerpsTabView = jest.requireMock(
        '../../UI/Perps/Views/PerpsTabView',
      ).default;
      mockPerpsTabView.mockClear();

      // Setup navigation mock
      mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => false),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => ({
            dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
            addListener: jest.fn(() => jest.fn()),
            dangerouslyGetParent: jest.fn(() => undefined),
          })),
        })),
      } as unknown as NavigationProp<ParamListBase>;

      // Default to enabled
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = false;
      mockPredictEnabled = true;
      mockPredictGTMModalEnabled = false;
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockPerpsEnabled = true; // Reset to default
      mockPerpsGTMModalEnabled = false; // Reset to default
      mockPredictEnabled = true; // Reset to default
      mockPredictGTMModalEnabled = false; // Reset to default
    });

    it('registers PerpsTabView visibility callback when Perps is enabled', () => {
      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      expect(mockTabsListComponent).toHaveBeenCalled();
      expect(mockPerpsTabView).toHaveBeenCalled();

      const perpsTabViewProps = mockPerpsTabView.mock.calls.at(-1)?.[0];
      expect(perpsTabViewProps).toBeDefined();
      if (!perpsTabViewProps) {
        return;
      }
      expect(perpsTabViewProps.onVisibilityChange).toBeDefined();
      expect(typeof perpsTabViewProps.onVisibilityChange).toBe('function');
      expect(perpsTabViewProps.isVisible).toBe(false);
    });

    it('sets Perps tab as not visible while the tokens tab is selected', () => {
      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      const perpsTabViewProps = mockPerpsTabView.mock.calls.at(-1)?.[0];
      expect(perpsTabViewProps).toBeDefined();
      if (!perpsTabViewProps) {
        return;
      }
      expect(perpsTabViewProps.isVisible).toBe(false);
    });

    it('should not render PerpsTabView when Perps is disabled', () => {
      // Set the flag to disabled for this test
      mockPerpsEnabled = false;

      const state = mockInitialStateWithRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // PerpsTabView should not be rendered
      expect(mockPerpsTabView).not.toHaveBeenCalled();
    });

    it('does not mount PerpsTabView when Perps is disabled after a tab change', () => {
      // Set the flag to disabled for this test
      mockPerpsEnabled = false;

      const state = mockInitialStateWithRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      const tabsList = mockTabsListComponent.mock.calls.at(-1)?.[0];
      if (!tabsList?.onChangeTab) {
        throw new Error('Expected TabsList onChangeTab');
      }
      tabsList.onChangeTab({
        i: 1,
        ref: { props: { tabLabel: 'Perps' } },
      });

      expect(mockPerpsTabView).not.toHaveBeenCalled();
    });
  });

  describe('Predict Tab Visibility', () => {
    let mockPredictTabView: jest.Mock;
    let mockNavigation: NavigationProp<ParamListBase>;

    beforeEach(() => {
      // Get the actual mock that was created at the top
      mockPredictTabView = jest.requireMock(
        '../../UI/Predict/views/PredictTabView',
      ).default;
      mockPredictTabView.mockClear();

      // Setup navigation mock
      mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => false),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => ({
            dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
            addListener: jest.fn(() => jest.fn()),
            dangerouslyGetParent: jest.fn(() => undefined),
          })),
        })),
      } as unknown as NavigationProp<ParamListBase>;

      // Default to enabled
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = false;
      mockPredictEnabled = true;
      mockPredictGTMModalEnabled = false;
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockPerpsEnabled = true; // Reset to default
      mockPerpsGTMModalEnabled = false; // Reset to default
      mockPredictEnabled = true; // Reset to default
      mockPredictGTMModalEnabled = false; // Reset to default
    });

    it('renders PredictTabView when Predict is enabled', () => {
      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        predictTradingEnabled: {
          enabled: true,
          minimumVersion: '7.60.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      expect(mockTabsListComponent).toHaveBeenCalled();
      expect(mockPredictTabView).toHaveBeenCalled();

      const predictTabViewProps = mockPredictTabView.mock.calls.at(-1)?.[0];
      expect(predictTabViewProps).toBeDefined();
      if (!predictTabViewProps) {
        return;
      }
      expect(predictTabViewProps.isVisible).toBe(false);
    });

    it('keeps Predict tab not visible while the tokens tab is selected when Perps is enabled', () => {
      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        predictTradingEnabled: {
          enabled: true,
          minimumVersion: '7.60.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      const predictTabViewProps = mockPredictTabView.mock.calls.at(-1)?.[0];
      expect(predictTabViewProps).toBeDefined();
      if (!predictTabViewProps) {
        return;
      }
      expect(predictTabViewProps.isVisible).toBe(false);
    });

    it('keeps Predict tab not visible while the tokens tab is selected when Perps is disabled', () => {
      // Set Perps to disabled for this test
      mockPerpsEnabled = false;

      const state = mockInitialStateWithRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
        predictTradingEnabled: {
          enabled: true,
          minimumVersion: '7.60.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      const predictTabViewProps = mockPredictTabView.mock.calls.at(-1)?.[0];
      expect(predictTabViewProps).toBeDefined();
      if (!predictTabViewProps) {
        return;
      }
      expect(predictTabViewProps.isVisible).toBe(false);
    });

    it('does not render PredictTabView when Predict is disabled', () => {
      // Set the flag to disabled for this test
      mockPredictEnabled = false;

      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        predictTradingEnabled: {
          enabled: false,
          minimumVersion: '7.60.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // PredictTabView should not be rendered
      expect(mockPredictTabView).not.toHaveBeenCalled();
    });

    it('does not mount PredictTabView when Predict is disabled after a tab change', () => {
      // Set the flag to disabled for this test
      mockPredictEnabled = false;

      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        predictTradingEnabled: {
          enabled: false,
          minimumVersion: '7.60.0',
        },
      });

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      const tabsList = mockTabsListComponent.mock.calls.at(-1)?.[0];
      if (!tabsList?.onChangeTab) {
        throw new Error('Expected TabsList onChangeTab');
      }
      tabsList.onChangeTab({
        i: 2,
        ref: { props: { tabLabel: 'Predict' } },
      });

      expect(mockPredictTabView).not.toHaveBeenCalled();
    });
  });

  describe('Perps GTM Modal Navigation', () => {
    let mockNavigation: NavigationProp<ParamListBase>;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(StorageWrapper.getItem).mockClear();
      mockNavigate.mockClear();

      // Setup navigation mock
      mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => false),
        dangerouslyGetParent: jest.fn(() => ({
          dangerouslyGetState: jest.fn(() => ({ type: 'stack' })),
          addListener: jest.fn(() => jest.fn()),
          dangerouslyGetParent: jest.fn(() => ({
            dangerouslyGetState: jest.fn(() => ({ type: 'tab' })),
            addListener: jest.fn(() => jest.fn()),
            dangerouslyGetParent: jest.fn(() => undefined),
          })),
        })),
      } as unknown as NavigationProp<ParamListBase>;

      // Reset flags to default state
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = false;
      mockPredictEnabled = true;
      mockPredictGTMModalEnabled = false;
    });

    afterEach(() => {
      // Reset mocks and flags
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = false;
      mockPredictEnabled = true;
      mockPredictGTMModalEnabled = false;
      jest.clearAllMocks();
    });

    it('should navigate to GTM modal when both flags are enabled and modal not shown', async () => {
      // Arrange
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = true;
      jest.mocked(StorageWrapper.getItem).mockResolvedValue(null); // Modal not shown yet

      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        perpsPerpTradingGTMModalEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      // Act
      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Wait for useEffect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:perpsGTMModalShown',
      );
      expect(mockNavigate).toHaveBeenCalledWith('PerpsModals', {
        screen: 'PerpsGTMModal',
      });
    });

    it('should not navigate to GTM modal when already shown', async () => {
      // Arrange
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = true;
      jest.mocked(StorageWrapper.getItem).mockResolvedValue('true'); // Modal already shown

      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        perpsPerpTradingGTMModalEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      // Act
      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Wait for useEffect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:perpsGTMModalShown',
      );
      expect(mockNavigate).not.toHaveBeenCalledWith('PerpsModals', {
        screen: 'PerpsGTMModal',
      });
    });

    it('should not navigate to GTM modal when Perps feature is disabled', async () => {
      // Arrange
      mockPerpsEnabled = false;
      mockPerpsGTMModalEnabled = true;
      jest.mocked(StorageWrapper.getItem).mockResolvedValue(null);

      const state = mockInitialStateWithRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
        perpsPerpTradingGTMModalEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      // Act
      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Wait for useEffect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(
        '@MetaMask:perpsGTMModalShown',
      );
      expect(mockNavigate).not.toHaveBeenCalledWith('PerpsModals', {
        screen: 'PerpsGTMModal',
      });
    });

    it('should not navigate to GTM modal when GTM modal feature is disabled', async () => {
      // Arrange
      mockPerpsEnabled = true;
      mockPerpsGTMModalEnabled = false;
      jest.mocked(StorageWrapper.getItem).mockResolvedValue(null);

      const state = mockInitialStateWithRemoteFeatureFlags({
        ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
          string,
          Json
        >),
        perpsPerpTradingGTMModalEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      // Act
      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Wait for useEffect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(
        '@MetaMask:perpsGTMModalShown',
      );
      expect(mockNavigate).not.toHaveBeenCalledWith('PerpsModals', {
        screen: 'PerpsGTMModal',
      });
    });
  });
});

describe('HomepageScrollContext callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomepageSectionsEnabled = true;
    capturedContext = null;
  });

  afterEach(() => {
    mockHomepageSectionsEnabled = false;
  });

  const renderWalletWithSections = () =>
    //@ts-expect-error we are ignoring navigation params on purpose
    render(Wallet);

  it('getVisitMaxDepth returns -1 before any section is viewed', () => {
    renderWalletWithSections();
    expect(capturedContext.getVisitMaxDepth()).toBe(-1);
  });

  it('notifySectionViewed with recordDepth=true updates max depth', () => {
    renderWalletWithSections();
    capturedContext.notifySectionViewed('tokens', 2, true);
    expect(capturedContext.getVisitMaxDepth()).toBe(2);
  });

  it('notifySectionViewed with recordDepth=false does not update max depth', () => {
    renderWalletWithSections();
    capturedContext.notifySectionViewed('defi', 3, false);
    expect(capturedContext.getVisitMaxDepth()).toBe(-1);
  });

  it('does not decrease depth when a lower index is viewed after a higher one', () => {
    renderWalletWithSections();
    capturedContext.notifySectionViewed('tokens', 5, true);
    capturedContext.notifySectionViewed('defi', 2, true);
    expect(capturedContext.getVisitMaxDepth()).toBe(5);
  });

  it('appSessionId is a non-empty string', () => {
    renderWalletWithSections();
    expect(typeof capturedContext.appSessionId).toBe('string');
    expect(capturedContext.appSessionId.length).toBeGreaterThan(0);
  });

  it('useFocusEffect reset callback clears maxDepth back to -1', () => {
    renderWalletWithSections();
    capturedContext.notifySectionViewed('tokens', 5, true);
    expect(capturedContext.getVisitMaxDepth()).toBe(5);

    // Search through all registered useFocusEffect callbacks to find the one
    // that resets depth. We do this instead of assuming a fixed index because
    // the count of calls can vary depending on which other hooks inside Wallet
    // also use useFocusEffect (e.g. useHomepageEntryPoint, modal hooks, etc.).
    const mockUseFocusEffectFn = jest.mocked(useFocusEffect);
    let resetFound = false;
    for (const call of mockUseFocusEffectFn.mock.calls) {
      const callback = call[0] as (() => void) | undefined;
      if (!callback) continue;
      callback();
      if (capturedContext.getVisitMaxDepth() === -1) {
        resetFound = true;
        break;
      }
      // Restore depth so we can keep searching
      capturedContext.notifySectionViewed('tokens', 5, true);
    }

    expect(resetFound).toBe(true);
    expect(capturedContext.getVisitMaxDepth()).toBe(-1);
  });
});

describe('useHomeDeepLinkEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const arrangeMocks = () => {
    const mockSetParams = jest.fn();
    const mockOnPerpsTabsSelected = jest.fn();
    const mockOnNetworkSelectorSelected = jest.fn();
    const mockUseRoute = jest
      .mocked(useRoute)
      .mockReturnValue({ key: 'route', name: 'route', params: {} });
    return {
      mockNavigate,
      mockSetParams,
      navigation: {
        setParams: mockSetParams,
      } as unknown as NavigationProp<ParamListBase>,
      mockUseRoute,
      mockOnPerpsTabsSelected,
      mockOnNetworkSelectorSelected,
    };
  };

  interface DeepLinkTestCase {
    testName: string;
    params: Record<string, unknown>;
    isPerpsEnabled: boolean;
    assertCase: (mocks: ReturnType<typeof arrangeMocks>) => void;
  }

  const testCases: DeepLinkTestCase[] = [
    {
      testName: 'navigates to perps tab when shouldSelectPerpsTab is true',
      params: { shouldSelectPerpsTab: true },
      isPerpsEnabled: true,
      assertCase: (mocks) => {
        expect(mocks.mockOnPerpsTabsSelected).toHaveBeenCalled();
        expect(mocks.mockSetParams).toHaveBeenCalledWith({
          shouldSelectPerpsTab: null,
        });
      },
    },
    {
      testName: 'navigates to perps tab when initialTab is perps',
      params: { initialTab: 'perps' },
      isPerpsEnabled: true,
      assertCase: (mocks) => {
        expect(mocks.mockOnPerpsTabsSelected).toHaveBeenCalled();
        expect(mocks.mockSetParams).toHaveBeenCalledWith({ initialTab: null });
      },
    },
    {
      testName:
        'navigates to network selector when openNetworkSelector is true',
      params: { openNetworkSelector: true },
      isPerpsEnabled: false,
      assertCase: (mocks) => {
        expect(mocks.mockOnNetworkSelectorSelected).toHaveBeenCalled();
        expect(mocks.mockSetParams).toHaveBeenCalledWith({
          openNetworkSelector: null,
        });
      },
    },
    {
      testName:
        'performs no deeplink action when no deeplink params are provided',
      params: {}, // no deeplink params
      isPerpsEnabled: true,
      assertCase: (mocks) => {
        expect(mocks.mockOnPerpsTabsSelected).not.toHaveBeenCalled();
        expect(mocks.mockOnNetworkSelectorSelected).not.toHaveBeenCalled();
        expect(mocks.mockSetParams).not.toHaveBeenCalled();
      },
    },
  ];

  it.each(testCases)('$testName', ({ params, isPerpsEnabled, assertCase }) => {
    const mocks = arrangeMocks();

    // Setup the mocked useRoute to return the provided params.
    mocks.mockUseRoute.mockReturnValue({
      key: 'route',
      name: 'route',
      params,
    });
    const mockUseFocusEffect = jest.mocked(useFocusEffect);

    renderHook(() =>
      useHomeDeepLinkEffects({
        isPerpsEnabled,
        onPerpsTabSelected: mocks.mockOnPerpsTabsSelected,
        onNetworkSelectorSelected: mocks.mockOnNetworkSelectorSelected,
        navigation: mocks.navigation,
      }),
    );

    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    jest.advanceTimersByTime(PERFORMANCE_CONFIG.NavigationParamsDelayMs);
    assertCase(mocks);
  });
});
