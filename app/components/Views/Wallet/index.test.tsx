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
jest.mock('../AssetDetails/AssetDetailsActions', () =>
  jest.fn((_props) => null),
);

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

// Mock remoteFeatureFlag util to ensure version check passes
jest.mock('../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
  validatedVersionGatedFeatureFlag: jest.fn(() => false),
}));

jest.mock(
  '../../../selectors/featureFlagController//multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

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

// Create shared mock reference for TabsList
let mockTabsListComponent: jest.Mock;

jest.mock('../../../component-library/components-temp/Tabs', () => {
  const ReactMock = jest.requireActual('react');
  const mockComponent = jest.fn((props) =>
    // Render children so we can test them
    ReactMock.createElement('View', null, props.children),
  );

  // Store reference for tests
  mockTabsListComponent = mockComponent;

  return {
    __esModule: true,
    TabsList: mockComponent,
    TabsListRef: {},
  };
});

import Wallet from './';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { screen as RNScreen } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { mockedPerpsFeatureFlagsEnabledState } from '../../UI/Perps/mocks/remoteFeatureFlagMocks';
import { initialState as cardInitialState } from '../../../core/redux/slices/card';
import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

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
      TokenRatesController: {
        poll: jest.fn(),
      },
      TokenDetectionController: {
        detectTokens: jest.fn(),
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
                isUnifiedUIEnabled: false, // Default to false in base state
              },
            },
          },
          sendRedesign: {
            enabled: false,
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
        selectedAddress: MOCK_ADDRESS,
        identities: {
          [MOCK_ADDRESS]: {
            address: MOCK_ADDRESS,
            name: 'Account 1',
          },
        },
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

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(() => ({
    selectNetwork: jest.fn(),
  })),
}));

// Better navigation mock pattern (from WalletActions.test.tsx)
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(() => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    })),
    useRoute: jest.fn(() => ({
      params: {},
    })),
    useFocusEffect: jest.fn(),
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
  it('should render the address copy button', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const addressCopyButton = RNScreen.getByTestId(
      WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON,
    );
    expect(addressCopyButton).toBeDefined();
  });
  it('should render the account picker', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const accountPicker = RNScreen.getByTestId(
      WalletViewSelectorsIDs.ACCOUNT_ICON,
    );
    expect(accountPicker).toBeDefined();
  });

  it('should render scan qr icon', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const scanButton = RNScreen.getByTestId(
      WalletViewSelectorsIDs.WALLET_SCAN_BUTTON,
    );
    expect(scanButton).toBeDefined();
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

  // Simple test to verify mock setup
  it('should have proper mock setup', () => {
    expect(typeof jest.fn()).toBe('function');
    expect(typeof mockTabsListComponent).toBe('function');
    expect(jest.fn()).toBeDefined();
    expect(mockTabsListComponent).toBeDefined();
  });

  // Unified UI Feature Flag Tests
  describe('Unified UI Feature Flag', () => {
    // Get reference to the mocked component
    const mockAssetDetailsActions = jest.mocked(
      jest.requireMock('../AssetDetails/AssetDetailsActions'),
    );

    beforeEach(() => {
      jest.clearAllMocks();
      mockAssetDetailsActions.mockClear();
      mockTabsListComponent.mockClear();
    });

    it('should pass all required props to AssetDetailsActions', () => {
      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(mockInitialState),
        );

      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      // Check that AssetDetailsActions was called with all required props
      expect(mockAssetDetailsActions.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          displayBuyButton: expect.any(Boolean),
          displaySwapsButton: expect.any(Boolean),
          goToSwaps: expect.any(Function),
          onReceive: expect.any(Function),
          onSend: expect.any(Function),
          buyButtonActionID: 'wallet-buy-button',
          swapButtonActionID: 'wallet-swap-button',
          sendButtonActionID: 'wallet-send-button',
          receiveButtonActionID: 'wallet-receive-button',
        }),
      );
    });
  });

  // Callback Functions Tests
  describe('AssetDetailsActions Callback Functions', () => {
    const mockAssetDetailsActions = jest.mocked(
      jest.requireMock('../AssetDetails/AssetDetailsActions'),
    );

    beforeEach(() => {
      jest.clearAllMocks();
      mockAssetDetailsActions.mockClear();
      mockNavigate.mockClear();
    });

    it('should handle onReceive callback correctly', () => {
      // Arrange - Create mock state with required data for onReceive
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
                  'account-id-1': {
                    address: '0x123456789',
                    id: 'account-id-1',
                    type: 'eip155:eoa',
                  },
                },
                selectedAccount: 'account-id-1',
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: 'group-id-123',
              },
            },
            NetworkController: {
              ...mockInitialState.engine.backgroundState.NetworkController,
              providerConfig: {
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

      // Act
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);
      const onReceive = mockAssetDetailsActions.mock.calls[0][0].onReceive;
      onReceive();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
        {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
          params: expect.objectContaining({
            address: expect.any(String),
            networkName: expect.any(String),
            chainId: expect.any(String),
            groupId: expect.any(String),
          }),
        },
      );
    });

    it('should handle onReceive callback correctly when multichain accounts state 2 is enabled', () => {
      // Arrange - Create mock state with state2 enabled and required data
      const mockStateWithState2 = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: 'group-id-123',
              },
            },
          },
        },
      };

      jest.mocked(useSelector).mockImplementation((callback) => {
        const selectorString = callback.toString();
        // Override specific selectors for state2 test
        if (selectorString.includes('selectMultichainAccountsState2Enabled')) {
          return true;
        }
        if (selectorString.includes('selectSelectedAccountGroupId')) {
          return 'group-id-123'; // Ensure this returns the group ID
        }
        return callback(mockStateWithState2);
      });

      // Act
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);
      const onReceive = mockAssetDetailsActions.mock.calls[0][0].onReceive;
      onReceive();

      // Assert - createAddressListNavigationDetails spreads an array [route, params]
      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate.mock.calls[0]).toBeDefined();
      // Verify it was called with address list navigation (state2 behavior)
      const [route, params] = mockNavigate.mock.calls[0];
      expect(route).toBeDefined();
      expect(params).toBeDefined();
    });

    it('should handle onSend callback correctly with native currency', async () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const onSend = mockAssetDetailsActions.mock.calls[0][0].onSend;
      await onSend();

      const sendFlowNavigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'SendFlowView',
      );
      expect(sendFlowNavigationCall).toBeDefined();
    });

    it('should handle onSend callback correctly without native currency', async () => {
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

      const onSend = mockAssetDetailsActions.mock.calls[0][0].onSend;
      await onSend();

      const sendFlowNavigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'SendFlowView',
      );
      expect(sendFlowNavigationCall).toBeDefined();
    });

    it('should pass correct props to AssetDetailsActions (no onBuy prop needed)', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      // Verify that AssetDetailsActions is called without onBuy prop
      const passedProps = mockAssetDetailsActions.mock.calls[0][0];
      expect(passedProps.onBuy).toBeUndefined();
      expect(passedProps.buyButtonActionID).toBeDefined();
    });

    it('should handle goToSwaps callback correctly', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const goToSwaps = mockAssetDetailsActions.mock.calls[0][0].goToSwaps;
      expect(typeof goToSwaps).toBe('function');
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

    it('should handle errors in onSend callback gracefully', async () => {
      // Mock dispatch to throw an error
      const mockDispatch = jest.fn().mockImplementation(() => {
        throw new Error('Transaction initialization failed');
      });

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) => {
          const selectorString = callback.toString();
          if (selectorString.includes('useDispatch')) {
            return mockDispatch;
          }
          return callback(mockInitialState);
        });

      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const mockAssetDetailsActions = jest.mocked(
        jest.requireMock('../AssetDetails/AssetDetailsActions'),
      );
      const onSend = mockAssetDetailsActions.mock.calls[0][0].onSend;

      await onSend();

      // Should still navigate even if there's an error
      const sendFlowNavigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'SendFlowView',
      );
      expect(sendFlowNavigationCall).toBeDefined();
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
      } as unknown as NavigationProp<RootParamList>;

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
      } as unknown as NavigationProp<RootParamList>;

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

  describe('Network Manager Integration', () => {
    const { useNetworkSelection } = jest.requireMock(
      '../../../components/hooks/useNetworkSelection/useNetworkSelection',
    );

    // Common test configurations
    const createMockSelectNetwork = () => jest.fn();

    const createStateWithEnabledNetworks = (enabledNetworks: string[]) => ({
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NetworkEnablementController: {
            ...mockInitialState.engine.backgroundState
              .NetworkEnablementController,
            enabledNetworkMap: {
              eip155: enabledNetworks.reduce(
                (acc, network) => {
                  acc[network] = true;
                  return acc;
                },
                {} as Record<string, boolean>,
              ),
            },
          },
        },
      },
    });

    const setupMocks = (mockSelectNetwork: jest.Mock) => {
      jest.mocked(useNetworkSelection).mockReturnValue({
        selectNetwork: mockSelectNetwork,
      });
    };

    const renderWalletWithState = (state: unknown) => {
      jest
        .mocked(useSelector)
        .mockImplementation((callback) => callback(state));
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call selectNetwork when no enabled EVM networks', () => {
      const mockSelectNetwork = createMockSelectNetwork();
      setupMocks(mockSelectNetwork);

      const stateWithNoEnabledNetworks = createStateWithEnabledNetworks([]);
      renderWalletWithState(stateWithNoEnabledNetworks);

      expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
    });

    it('should not call selectNetwork when there are enabled EVM networks', () => {
      const mockSelectNetwork = createMockSelectNetwork();
      setupMocks(mockSelectNetwork);

      const stateWithEnabledNetworks = createStateWithEnabledNetworks([
        '0x1',
        '0x5',
      ]);
      renderWalletWithState(stateWithEnabledNetworks);

      expect(mockSelectNetwork).not.toHaveBeenCalled();
    });
  });

  describe('Perps Tab Visibility', () => {
    let mockPerpsTabView: jest.Mock;
    let mockNavigation: NavigationProp<RootParamList>;

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
      } as unknown as NavigationProp<RootParamList>;

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

    it('should register visibility callback when Perps is enabled', () => {
      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Debug: Check if TabsList was rendered
      expect(mockTabsListComponent).toHaveBeenCalled();

      // Check that PerpsTabView was rendered
      expect(mockPerpsTabView).toHaveBeenCalled();

      // Check the props it was called with
      const perpsTabViewProps = mockPerpsTabView.mock.calls[0][0];
      expect(perpsTabViewProps.onVisibilityChange).toBeDefined();
      expect(typeof perpsTabViewProps.onVisibilityChange).toBe('function');
      expect(perpsTabViewProps.isVisible).toBe(false); // Initially not visible (tab 0 is selected)
    });

    it('should calculate correct perpsTabIndex when Perps is enabled', () => {
      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Perps should be at index 1 when enabled (after Tokens at index 0)
      const perpsTabViewProps = mockPerpsTabView.mock.calls[0][0];
      expect(perpsTabViewProps.isVisible).toBe(false); // Initially not visible (tab 0 is selected)
    });

    it('should not render PerpsTabView when Perps is disabled', () => {
      // Set the flag to disabled for this test
      mockPerpsEnabled = false;

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                perpsPerpTradingEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // PerpsTabView should not be rendered
      expect(mockPerpsTabView).not.toHaveBeenCalled();
    });

    it('should not call visibility callback when Perps is disabled', () => {
      // Set the flag to disabled for this test
      mockPerpsEnabled = false;

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                perpsPerpTradingEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Simulate tab change
      const tabsList = mockTabsListComponent.mock.calls[0][0];
      tabsList.onChangeTab({
        i: 1,
        ref: { props: { tabLabel: 'Perps' } },
      });

      // Perps visibility callback should not be called since Perps is disabled
      expect(mockPerpsTabView).not.toHaveBeenCalled();
    });
  });

  describe('Predict Tab Visibility', () => {
    let mockPredictTabView: jest.Mock;
    let mockNavigation: NavigationProp<RootParamList>;

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
      } as unknown as NavigationProp<RootParamList>;

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

    it('should render PredictTabView when Predict is enabled', () => {
      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                predictTradingEnabled: {
                  enabled: true,
                  minimumVersion: '7.60.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Debug: Check if TabsList was rendered
      expect(mockTabsListComponent).toHaveBeenCalled();

      // Check that PredictTabView was rendered
      expect(mockPredictTabView).toHaveBeenCalled();

      // Check the props it was called with
      const predictTabViewProps = mockPredictTabView.mock.calls[0][0];
      expect(predictTabViewProps.isVisible).toBe(false); // Initially not visible (tab 0 is selected)
    });

    it('should calculate correct predictTabIndex when both Perps and Predict are enabled', () => {
      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                predictTradingEnabled: {
                  enabled: true,
                  minimumVersion: '7.60.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Predict should be at index 2 when Perps is enabled (Tokens=0, Perps=1, Predict=2)
      const predictTabViewProps = mockPredictTabView.mock.calls[0][0];
      expect(predictTabViewProps.isVisible).toBe(false); // Initially not visible (tab 0 is selected)
    });

    it('should calculate correct predictTabIndex when Predict is enabled but Perps is disabled', () => {
      // Set Perps to disabled for this test
      mockPerpsEnabled = false;

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                perpsPerpTradingEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
                predictTradingEnabled: {
                  enabled: true,
                  minimumVersion: '7.60.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Predict should be at index 1 when Perps is disabled (Tokens=0, Predict=1)
      const predictTabViewProps = mockPredictTabView.mock.calls[0][0];
      expect(predictTabViewProps.isVisible).toBe(false); // Initially not visible (tab 0 is selected)
    });

    it('should not render PredictTabView when Predict is disabled', () => {
      // Set the flag to disabled for this test
      mockPredictEnabled = false;

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                predictTradingEnabled: {
                  enabled: false,
                  minimumVersion: '7.60.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // PredictTabView should not be rendered
      expect(mockPredictTabView).not.toHaveBeenCalled();
    });

    it('should not render PredictTabView on tab change when Predict is disabled', () => {
      // Set the flag to disabled for this test
      mockPredictEnabled = false;

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                predictTradingEnabled: {
                  enabled: false,
                  minimumVersion: '7.60.0',
                },
              },
            },
          },
        },
      };

      renderWithProvider(
        <Wallet navigation={mockNavigation} currentRouteName="Wallet" />,
        { state },
      );

      // Simulate tab change
      const tabsList = mockTabsListComponent.mock.calls[0][0];
      tabsList.onChangeTab({
        i: 2,
        ref: { props: { tabLabel: 'Predict' } },
      });

      // PredictTabView should not be rendered since Predict is disabled
      expect(mockPredictTabView).not.toHaveBeenCalled();
    });
  });

  describe('Perps GTM Modal Navigation', () => {
    let mockNavigation: NavigationProp<RootParamList>;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(StorageWrapper.getItem).mockClear();
      mockNavigate.mockClear();

      // Setup navigation mock
      mockNavigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      } as unknown as NavigationProp<RootParamList>;

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

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                perpsPerpTradingGTMModalEnabled: {
                  enabled: true,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

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

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                perpsPerpTradingGTMModalEnabled: {
                  enabled: true,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

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

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                perpsPerpTradingEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
                perpsPerpTradingGTMModalEnabled: {
                  enabled: true,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

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

      const state = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                ...(mockedPerpsFeatureFlagsEnabledState as unknown as Record<
                  string,
                  Json
                >),
                perpsPerpTradingGTMModalEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      };

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
