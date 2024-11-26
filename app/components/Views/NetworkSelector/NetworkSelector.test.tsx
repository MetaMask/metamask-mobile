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

jest.mock('../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
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
    PreferencesController: {
      setShowTestNetworks: jest.fn(),
    },
    CurrencyRateController: { updateExchangeRate: jest.fn() },
    AccountTrackerController: { refresh: jest.fn() },
  },
}));

const initialState = {
  navigation: { currentBottomNavRoute: 'Wallet' },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accounts: {
          '0x': {
            name: 'account 1',
            address: '0x',
            balance: 0,
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
      },
      NftController: {
        allNfts: { '0x': { '0x1': [] } },
        allNftContracts: { '0x': { '0x1': [] } },
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

    expect(mockEngine.context.NetworkController.setActiveNetwork).toBeCalled();
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

    expect(mockEngine.context.NetworkController.setActiveNetwork).toBeCalled();
  });

  it('changes to test network when another network cell is pressed', async () => {
    const { getByText } = renderComponent({
      navigation: { currentBottomNavRoute: 'Wallet' },
      settings: {
        primaryCurrency: 'usd',
      },
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            showTestNetworks: true,
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

    expect(mockEngine.context.NetworkController.setActiveNetwork).toBeCalled();
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
      const lineaRpcUrl = getByText('https://linea-rpc.publicnode.com');
      const lineaCell = getByText('Linea');
      expect(lineaCell).toBeTruthy();
      expect(lineaRpcUrl).toBeTruthy();
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
      const mainnetRpcUrl = getByText('https://mainnet-rpc.publicnode.com');
      const mainnetCell = getByText('Ethereum Mainnet');
      expect(mainnetCell).toBeTruthy();
      expect(mainnetRpcUrl).toBeTruthy();
    });
  });
});
