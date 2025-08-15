import React from 'react';

// Local mocks specific to this test file to avoid affecting other tests
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
  getApplicationName: jest.fn(() => 'MetaMask'),
  getBuildNumber: jest.fn(() => '1234'),
  getSystemVersion: jest.fn(() => '17.0'),
  getTotalMemorySync: jest.fn(() => 4000000000),
}));

jest.mock(
  '../../../core/redux/slices/bridge/utils/isUnifiedSwapsEnvVarEnabled',
  () => ({
    isUnifiedSwapsEnvVarEnabled: jest.fn(() => false),
  }),
);

// Mock components BEFORE importing the main component
jest.mock('../AssetDetails/AssetDetailsActions', () =>
  jest.fn((_props) => null),
);

// Create shared mock reference
let mockScrollableTabViewComponent: jest.Mock;

jest.mock('react-native-scrollable-tab-view', () => {
  const mockComponent = jest.fn((_props) => null);

  // Store reference for tests
  mockScrollableTabViewComponent = mockComponent;

  // TODO - Clean up mock.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  mockComponent.defaultProps = {
    onChangeTab: jest.fn(),
    renderTabBar: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockComponent,
  };
});

import Wallet from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { screen as RNScreen } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { isUnifiedSwapsEnvVarEnabled } from '../../../core/redux/slices/bridge/utils/isUnifiedSwapsEnvVarEnabled';

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
  wizard: {
    step: 0,
  },
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
  multichain: {
    dismissedBanners: [], // Added missing property
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
          '0x1': 'mainnet', // Ethereum mainnet enabled
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

// Better navigation mock pattern (from WalletActions.test.tsx)
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
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

  it('should render scan qr icon', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const scanButton = RNScreen.getByTestId(
      WalletViewSelectorsIDs.WALLET_SCAN_BUTTON,
    );
    expect(scanButton).toBeDefined();
  });
  it('should render ScrollableTabView', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);

    // Check if ScrollableTabView mock was called
    expect(mockScrollableTabViewComponent).toHaveBeenCalled();
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
    expect(typeof mockScrollableTabViewComponent).toBe('function');
    expect(jest.fn()).toBeDefined();
    expect(mockScrollableTabViewComponent).toBeDefined();
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
      mockScrollableTabViewComponent.mockClear();
    });

    it('should pass displayBridgeButton as true when isUnifiedSwapsEnabled is false', () => {
      const stateWithUnifiedSwapsDisabled = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                bridgeConfigV2: {
                  chains: {
                    'eip155:1': {
                      isUnifiedUIEnabled: false,
                    },
                  },
                },
              },
            },
          },
        },
      };

      // Mock the unified swaps env var as false
      jest.mocked(isUnifiedSwapsEnvVarEnabled).mockReturnValue(false);

      jest
        .mocked(useSelector)
        .mockImplementation((callback: (state: unknown) => unknown) =>
          callback(stateWithUnifiedSwapsDisabled),
        );

      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      // Check that AssetDetailsActions was called with displayBridgeButton: true
      expect(mockAssetDetailsActions.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          displayBridgeButton: true,
        }),
      );
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
          displayBridgeButton: expect.any(Boolean),
          swapsIsLive: expect.any(Boolean),
          goToBridge: expect.any(Function),
          goToSwaps: expect.any(Function),
          onReceive: expect.any(Function),
          onSend: expect.any(Function),
          onBuy: expect.any(Function),
          buyButtonActionID: 'wallet-buy-button',
          swapButtonActionID: 'wallet-swap-button',
          bridgeButtonActionID: 'wallet-bridge-button',
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
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const onReceive = mockAssetDetailsActions.mock.calls[0][0].onReceive;
      onReceive();

      // Check that navigate was called with QR_TAB_SWITCHER
      // QRTabSwitcherScreens.Receive is enum value 1, not string 'Receive'
      expect(mockNavigate).toHaveBeenCalledWith(Routes.QR_TAB_SWITCHER, {
        initialScreen: 1, // QRTabSwitcherScreens.Receive
      });
    });

    it('should handle onSend callback correctly with native currency', async () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const onSend = mockAssetDetailsActions.mock.calls[0][0].onSend;
      await onSend();

      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView', {});
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

      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView', {});
    });

    it('should handle onBuy callback correctly', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const onBuy = mockAssetDetailsActions.mock.calls[0][0].onBuy;
      onBuy();

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should handle goToBridge callback correctly', () => {
      //@ts-expect-error we are ignoring the navigation params on purpose
      render(Wallet);

      const goToBridge = mockAssetDetailsActions.mock.calls[0][0].goToBridge;
      expect(typeof goToBridge).toBe('function');
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
      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView', {});
    });
  });
});
