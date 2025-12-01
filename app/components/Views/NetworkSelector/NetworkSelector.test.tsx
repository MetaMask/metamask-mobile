// Third party dependencies
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent, waitFor } from '@testing-library/react-native';

// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { backgroundState } from '../../../util/test/initial-root-state';

// Internal dependencies
import NetworkSelector from './NetworkSelector';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkListModal.selectors';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import { mockNetworkState } from '../../../util/test/network';

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  removeItemFromChainIdList: jest.fn().mockReturnValue({
    chain_id_list: ['eip155:1'],
  }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(),
      })),
    })),
  }),
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      addTraitsToUser: jest.fn(),
    }),
  },
  MetaMetricsEvents: {
    NETWORK_SWITCHED: 'Network Switched',
  },
}));

// eslint-disable-next-line import/no-namespace
import * as selectedNetworkControllerFcts from '../../../selectors/selectedNetworkController';

const mockEngine = Engine;

const setShowTestNetworksSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setShowTestNetworks',
);

// Mock the entire module
jest.mock('../../../util/networks/isNetworkUiRedesignEnabled', () => ({
  isNetworkUiRedesignEnabled: jest.fn(),
}));

jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
}));

// Gas fees sponsored feature flag: enable for all networks in tests
jest.mock('../../../selectors/featureFlagController/gasFeesSponsored', () => ({
  getGasFeesSponsoredNetworkEnabled: () => (chainId: string) =>
    chainId === '0x38', // Enable sponsored label
}));

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
      updateNetwork: jest.fn(),
      getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x1' }),
      findNetworkClientIdByChainId: jest
        .fn()
        .mockReturnValue({ chainId: '0x1' }),
      getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
        blockExplorerUrls: [],
        chainId: '0x1',
        defaultRpcEndpointIndex: 0,
        name: 'Mainnet',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: 'mainnet',
            type: 'infura',
            url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
          },
        ],
      }),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    PreferencesController: {
      setShowTestNetworks: jest.fn(),
      setTokenNetworkFilter: jest.fn(),
      tokenNetworkFilter: {
        '0x1': true,
        '0xe708': true,
        '0xa86a': true,
        '0x89': true,
        '0xa': true,
        '0x64': true,
      },
    },
    CurrencyRateController: { updateExchangeRate: jest.fn() },
    AccountTrackerController: { refresh: jest.fn() },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
      update: jest.fn(),
    },
    NetworkEnablementController: {
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
      enableNetworkInNamespace: jest.fn(),
    },
  },
}));

const initialState = {
  user: {
    userLoggedIn: true,
  },
  navigation: { currentBottomNavRoute: 'Wallet' },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            '0x': {
              balance: 0,
            },
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: { status: 'available', EIPS: { '1559': true } },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 1,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
              {
                name: 'public',
                networkClientId: 'ea57f659-c004-4902-bfca-0c9688a43872',
                type: 'custom',
                url: 'https://mainnet-rpc.publicnode.com',
              },
            ],
          },
          '0xe708': {
            blockExplorerUrls: [],
            chainId: '0xe708',
            defaultRpcEndpointIndex: 1,
            name: 'Linea',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                type: 'infura',
                url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
              },
              {
                name: 'public',
                networkClientId: 'ea57f659-c004-4902-bfca-0c9688a43877',
                type: 'custom',
                url: 'https://linea-rpc.publicnode.com',
              },
            ],
          },
          '0xa86a': {
            blockExplorerUrls: ['https://snowtrace.io'],
            chainId: '0xa86a',
            defaultRpcEndpointIndex: 0,
            name: 'Avalanche Mainnet C-Chain',
            nativeCurrency: 'AVAX',
            rpcEndpoints: [
              {
                networkClientId: 'networkId1',
                type: 'custom',
                url: 'https://api.avax.network/ext/bc/C/rpc',
              },
              {
                networkClientId: 'networkId1',
                type: 'custom',
                url: 'https://api.avax2.network/ext/bc/C/rpc',
              },
            ],
          },
          '0x89': {
            blockExplorerUrls: ['https://polygonscan.com'],
            chainId: '0x89',
            defaultRpcEndpointIndex: 0,
            name: 'Polygon Mainnet',
            nativeCurrency: 'MATIC',
            rpcEndpoints: [
              {
                networkClientId: 'networkId2',
                type: 'infura',
                url: 'https://polygon-mainnet.infura.io/v3/12345',
              },
              {
                networkClientId: 'networkId3',
                type: 'infura',
                url: 'https://polygon-mainnet2.infura.io/v3/12345',
              },
            ],
          },
          '0xa': {
            blockExplorerUrls: ['https://optimistic.etherscan.io'],
            chainId: '0xa',
            defaultRpcEndpointIndex: 0,
            name: 'Optimism',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'networkId3',
                type: 'infura',
                url: 'https://optimism-mainnet.infura.io/v3/12345',
              },
            ],
          },
          '0x64': {
            blockExplorerUrls: ['https://blockscout.com/xdai/mainnet/'],
            chainId: '0x64',
            defaultRpcEndpointIndex: 0,
            name: 'Gnosis Chain',
            nativeCurrency: 'XDAI',
            rpcEndpoints: [
              {
                networkClientId: 'networkId4',
                type: 'custom',
                url: 'https://rpc.gnosischain.com/',
              },
            ],
          },
        },
      },
      CurrencyRateController: {
        conversionRate: 5,
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 5,
          },
        },
      },
      PreferencesController: {
        showTestNetworks: false,
        tokenNetworkFilter: {
          '0x1': true,
          '0xe708': true,
          '0xa86a': true,
          '0x89': true,
          '0xa': true,
          '0x64': true,
        },
      },
      NftController: {
        allNfts: { '0x': { '0x1': [] } },
        allNftContracts: { '0x': { '0x1': [] } },
      },
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
          },
        },
      },
    },
  },
};

const Stack = createStackNavigator();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="NETWORK_SELECTOR">
        {() => <NetworkSelector />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Network Selector', () => {
  it('renders correctly', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when network UI redesign is enabled', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when network UI redesign is enabled and calls setNetworkClientIdForDomain', async () => {
    const testMock = {
      networkName: '',
      networkImageSource: '',
      domainNetworkClientId: '',
      chainId: CHAIN_IDS.MAINNET,
      rpcUrl: '',
      domainIsConnectedDapp: true,
    };
    jest
      .spyOn(selectedNetworkControllerFcts, 'useNetworkInfo')
      .mockImplementation(() => testMock);
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);
    const mainnetCell = getByText('Ethereum Mainnet');
    fireEvent.press(mainnetCell);
    await waitFor(() => {
      expect(
        mockEngine.context.SelectedNetworkController
          .setNetworkClientIdForDomain,
      ).toBeCalled();
    });
  });

  it('shows popular networks when UI redesign is enabled', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);

    const popularNetworksTitle = getByText('Additional networks');
    expect(popularNetworksTitle).toBeTruthy();
  });

  it('changes network when another network cell is pressed', async () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);
    const { getByText } = renderComponent(initialState);
    const polygonCell = getByText('Polygon Mainnet');

    fireEvent.press(polygonCell);

    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).toBeCalled();
  });

  it('toggles the test networks switch correctly', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);
    const { getByTestId } = renderComponent(initialState);
    const testNetworksSwitch = getByTestId(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );

    fireEvent(testNetworksSwitch, 'onValueChange', true);

    expect(setShowTestNetworksSpy).toBeCalled();
  });

  it('toggle test network is disabled and is on when a testnet is selected', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);
    const { getByTestId } = renderComponent({
      user: {
        userLoggedIn: true,
      },
      navigation: { currentBottomNavRoute: 'Wallet' },
      settings: {
        primaryCurrency: 'usd',
      },
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          NetworkController: {
            selectedNetworkClientId: 'sepolia',
            networksMetadata: {
              mainnet: { status: 'available', EIPS: { '1559': true } },
              sepolia: { status: 'available', EIPS: { '1559': true } },
            },
            networkConfigurationsByChainId: {
              [CHAIN_IDS.MAINNET]: {
                blockExplorerUrls: ['https://etherscan.com'],
                chainId: CHAIN_IDS.MAINNET,
                defaultRpcEndpointIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    type: 'infura',
                    url: 'http://mainnet.infura.io',
                  },
                ],
              },
              [CHAIN_IDS.SEPOLIA]: {
                blockExplorerUrls: ['https://etherscan.com'],
                chainId: CHAIN_IDS.SEPOLIA,
                defaultRpcEndpointIndex: 0,
                name: 'Sepolia',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'sepolia',
                    type: 'infura',
                    url: 'http://sepolia.infura.io',
                  },
                ],
              },
            },
          },
        },
      },
    });
    const testNetworksSwitch = getByTestId(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );

    expect(testNetworksSwitch.props.value).toBeTruthy();
    expect(testNetworksSwitch.props.disabled).toBeTruthy();
  });

  it('changes to non infura network when another network cell is pressed', async () => {
    const { getByText } = renderComponent(initialState);
    const gnosisCell = getByText('Gnosis Chain');

    fireEvent.press(gnosisCell);
    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).toBeCalled();
  });

  it('changes to test network when another network cell is pressed', async () => {
    const { getByText } = renderComponent({
      user: {
        userLoggedIn: true,
      },
      navigation: { currentBottomNavRoute: 'Wallet' },
      settings: {
        primaryCurrency: 'usd',
      },
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            showTestNetworks: true,
            tokenNetworkFilter: {
              '0x1': true,
              '0xe708': true,
              '0xa86a': true,
              '0x89': true,
              '0xa': true,
              '0x64': true,
            },
          },
          NetworkController: {
            selectedNetworkClientId: 'sepolia',
            networksMetadata: {
              mainnet: { status: 'available', EIPS: { '1559': true } },
              sepolia: { status: 'available', EIPS: { '1559': true } },
            },
            networkConfigurationsByChainId: {
              [CHAIN_IDS.MAINNET]: {
                blockExplorerUrls: ['https://etherscan.com'],
                chainId: CHAIN_IDS.MAINNET,
                defaultRpcEndpointIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    type: 'infura',
                    url: 'http://mainnet.infura.io',
                  },
                ],
              },
              [CHAIN_IDS.SEPOLIA]: {
                blockExplorerUrls: ['https://etherscan.com'],
                chainId: CHAIN_IDS.SEPOLIA,
                defaultRpcEndpointIndex: 0,
                name: 'Sepolia',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'sepolia',
                    type: 'infura',
                    url: 'http://sepolia.infura.io',
                  },
                ],
              },
            },
          },
        },
      },
    });

    const sepoliaCell = getByText('Sepolia');

    fireEvent.press(sepoliaCell);

    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).toBeCalled();
  });

  it('renders correctly with no network configurations', async () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const stateWithNoNetworkConfigurations = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          NetworkController: {
            ...mockNetworkState({
              chainId: '0x1',
              id: 'Mainnet',
              nickname: 'Ethereum Main Network',
              ticker: 'ETH',
            }),
          },
        },
      },
    };

    const { getByText } = renderComponent(stateWithNoNetworkConfigurations);

    await waitFor(() => {
      const mainnetCell = getByText('Ethereum Main Network');
      expect(mainnetCell).toBeTruthy();
    });
  });

  it('renders the multi-RPC selection modal correctly', async () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);
    const polygonCell = getByText('Polygon Mainnet');

    fireEvent.press(polygonCell);

    // Assuming the modal opens after a slight delay
    await waitFor(() => {
      const rpcOption = getByText('polygon-mainnet.infura.io/v3');
      expect(rpcOption).toBeTruthy();
    });
  });

  it('switches RPC URL when a different RPC URL is selected', async () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);
    const polygonCell = getByText('Polygon Mainnet');

    fireEvent.press(polygonCell);

    await waitFor(() => {
      const rpcOption = getByText('polygon-mainnet.infura.io/v3');
      fireEvent.press(rpcOption);
    });
  });

  it('filters networks correctly when searching', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByPlaceholderText, queryByText } = renderComponent(initialState);

    const searchInput = getByPlaceholderText('Search');

    // Simulate entering a search term
    fireEvent.changeText(searchInput, 'Polygon');

    // Polygon should appear, but others should not
    expect(queryByText('Polygon Mainnet')).toBeTruthy();
    expect(queryByText('Avalanche Mainnet C-Chain')).toBeNull();

    // Clear search and check if all networks appear
    fireEvent.changeText(searchInput, '');
    expect(queryByText('Polygon Mainnet')).toBeTruthy();
    expect(queryByText('Avalanche Mainnet C-Chain')).toBeTruthy();
  });

  it('shows popular networks when network UI redesign is enabled', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);

    // Check that the additional networks section is rendered
    const popularNetworksTitle = getByText('Additional networks');
    expect(popularNetworksTitle).toBeTruthy();
  });

  it('opens the multi-RPC selection modal correctly', async () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByText } = renderComponent(initialState);

    const polygonCell = getByText('Polygon Mainnet');

    // Open the modal
    fireEvent.press(polygonCell);
    await waitFor(() => {
      const rpcOption = getByText('polygon-mainnet.infura.io/v3');
      expect(rpcOption).toBeTruthy();
    });
  });

  it('toggles test networks visibility when switch is used', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    const { getByTestId } = renderComponent(initialState);
    const testNetworksSwitch = getByTestId(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );

    // Toggle the switch on
    fireEvent(testNetworksSwitch, 'onValueChange', true);
    expect(setShowTestNetworksSpy).toBeCalledWith(true);

    // Toggle the switch off
    fireEvent(testNetworksSwitch, 'onValueChange', false);
    expect(setShowTestNetworksSpy).toBeCalledWith(false);
  });

  describe('renderLineaMainnet', () => {
    it('renders the linea mainnet cell correctly', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const { getByText } = renderComponent(initialState);
      const lineaRpcUrl = getByText('linea-rpc.publicnode.com');
      const lineaCell = getByText('Linea');
      expect(lineaCell).toBeTruthy();
      expect(lineaRpcUrl).toBeTruthy();
    });
  });

  describe('gas fees sponsored label', () => {
    it('renders "No network fee" label in redesigned UI list items', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);

      const { getAllByText, getByText } = renderComponent(initialState);

      expect(getByText('BNB Chain')).toBeTruthy();
      expect(getAllByText('No network fee').length).toBe(1);
    });

    it('renders "No network fee" as tertiary text in send flow', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const navModule = jest.requireMock('@react-navigation/native');
      jest
        .spyOn(navModule, 'useRoute')
        .mockReturnValue({ params: { source: 'SEND_FLOW' } });

      const { getAllByText, getByText } = renderComponent(initialState);

      expect(getByText('BNB Chain')).toBeTruthy();
      expect(getAllByText('No network fee').length).toBe(1);
    });
  });

  describe('renderRpcUrl', () => {
    it('renders the RPC URL correctly for avalanche', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const { getByText } = renderComponent(initialState);
      const avalancheRpcUrl = getByText('api.avax.network/ext/bc/C');
      const avalancheCell = getByText('Avalanche Mainnet C-Chain');
      expect(avalancheRpcUrl).toBeTruthy();
      expect(avalancheCell).toBeTruthy();
    });

    it('renders the RPC URL correctly for optimism single RPC endpoint', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const { getByText } = renderComponent(initialState);
      const optimismCell = getByText('Optimism');
      expect(optimismCell).toBeTruthy();
      expect(() => {
        getByText('https://optimism-mainnet.infura.io/v3/12345');
      }).toThrow();
    });
  });

  describe('renderMainnet', () => {
    it('renders the  mainnet cell correctly', () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const { getByText } = renderComponent(initialState);
      const mainnetRpcUrl = getByText('mainnet-rpc.publicnode.com');
      const mainnetCell = getByText('Ethereum Mainnet');
      expect(mainnetCell).toBeTruthy();
      expect(mainnetRpcUrl).toBeTruthy();
    });
  });

  describe('network switching with connected dapp', () => {
    beforeEach(() => {
      // Reset the mock before each test
      jest.clearAllMocks();
    });

    it('should not call setNetworkClientIdForDomain when dapp is not connected', async () => {
      // Mock non-connected dapp state
      const nonConnectedDappMock = {
        networkName: 'Test Network',
        networkImageSource: '',
        domainNetworkClientId: 'test-network-id',
        chainId: CHAIN_IDS.MAINNET,
        rpcUrl: 'https://test.network',
        domainIsConnectedDapp: false,
        origin: 'test-origin',
      };

      jest
        .spyOn(selectedNetworkControllerFcts, 'useNetworkInfo')
        .mockImplementation(() => nonConnectedDappMock);

      const { getByText } = renderComponent(initialState);

      const mainnetCell = getByText('Ethereum Mainnet');
      fireEvent.press(mainnetCell);

      // Wait a bit to ensure async operations complete
      await waitFor(() => {
        expect(
          mockEngine.context.SelectedNetworkController
            .setNetworkClientIdForDomain,
        ).not.toHaveBeenCalled();
        expect(
          mockEngine.context.MultichainNetworkController.setActiveNetwork,
        ).toHaveBeenCalled();
      });
    });
  });
});
