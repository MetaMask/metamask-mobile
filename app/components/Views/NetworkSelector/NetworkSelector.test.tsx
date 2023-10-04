// Third party dependencies
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

// Internal dependencies
import NetworkSelector from './NetworkSelector';

const mockEngine = Engine;

const setShowTestNetworksSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setShowTestNetworks',
);

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    NetworkController: { setActiveNetwork: jest.fn() },
    PreferencesController: {
      selectedAddress: '0x',
      identities: {
        '0x': { name: 'Account 1', address: '0x' },
      },
      setShowTestNetworks: jest.fn(),
    },
    CurrencyRateController: { setNativeCurrency: jest.fn() },
  },
}));

const initialState = {
  navigation: { currentBottomNavRoute: 'Wallet' },
  privacy: { thirdPartyApiMode: true },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
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
          chainId: '1',
        },
        networkConfigurations: {
          networkId1: {
            chainId: '43114',
            nickname: 'Avalanche Mainnet C-Chain',
            rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            ticker: 'AVAX',
          },
          networkId2: {
            chainId: '137',
            nickname: 'Polygon Mainnet',
            rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
            rpcUrl:
              'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
            ticker: 'MATIC',
          },
          networkId3: {
            chainId: '10',
            nickname: 'Optimism',
            rpcPrefs: { blockExplorerUrl: 'https://optimistic.etherscan.io' },
            rpcUrl:
              'https://optimism-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
            ticker: 'ETH',
          },
          networkId4: {
            chainId: '100',
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
      },
      PreferencesController: {
        showTestNetworks: false,
        selectedAddress: '0x',
        identities: {
          '0x': { name: 'Account 1', address: '0x' },
        },
      },
      NftController: {
        allNfts: { '0x': { '1': [] } },
        allNftContracts: { '0x': { '1': [] } },
      },
    },
  },
};

const Stack = createStackNavigator();

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
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('changes network when another network cell is pressed', async () => {
    const { getByText } = renderComponent(initialState);
    const polygonCell = getByText('Polygon Mainnet');

    fireEvent.press(polygonCell);

    expect(mockEngine.context.NetworkController.setActiveNetwork).toBeCalled();
  });
  it('toggles the test networks switch correctly', () => {
    const { getByTestId } = renderComponent(initialState);
    const testNetworksSwitch = getByTestId('test-network-switch-id');

    fireEvent(testNetworksSwitch, 'onValueChange', true);

    expect(setShowTestNetworksSpy).toBeCalled();
  });
  it('toggle test network is disabled and is on when a testnet is selected', () => {
    const { getByTestId } = renderComponent({
      navigation: { currentBottomNavRoute: 'Wallet' },
      privacy: { thirdPartyApiMode: true },
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
              nickname: 'Goerli mainnet',
              ticket: 'eth',
              chainId: '5',
            },
          },
        },
      },
    });
    const testNetworksSwitch = getByTestId('test-network-switch-id');

    expect(testNetworksSwitch.props.value).toBeTruthy();
    expect(testNetworksSwitch.props.disabled).toBeTruthy();
  });
});
