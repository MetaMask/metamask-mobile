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
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkListModal.selectors';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
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
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
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
        providerConfig: {
          type: 'mainnet',
          nickname: 'Ethereum mainnet',
          ticket: 'eth',
          chainId: '0x1',
        },
        networkConfigurations: {
          networkId1: {
            chainId: '0xa86a',
            nickname: 'Avalanche Mainnet C-Chain',
            rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            ticker: 'AVAX',
          },
          networkId2: {
            chainId: '0x89',
            nickname: 'Polygon Mainnet',
            rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
            rpcUrl: 'https://polygon-mainnet.infura.io/v3/12345',
            ticker: 'MATIC',
          },
          networkId3: {
            chainId: '0xa',
            nickname: 'Optimism',
            rpcPrefs: { blockExplorerUrl: 'https://optimistic.etherscan.io' },
            rpcUrl: 'https://optimism-mainnet.infura.io/v3/12345',
            ticker: 'ETH',
          },
          networkId4: {
            chainId: '0x64',
            nickname: 'Gnosis Chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://blockscout.com/xdai/mainnet/',
            },
            rpcUrl: 'https://rpc.gnosischain.com/',
            ticker: 'XDAI',
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
            ...initialState.engine.backgroundState.NetworkController,
            providerConfig: {
              type: 'mainnet',
              nickname: 'Sepolia mainnet',
              ticket: 'eth',
              chainId: CHAIN_IDS.SEPOLIA,
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
            ...initialState.engine.backgroundState.NetworkController,
            networkConfigurations: {},
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
});
