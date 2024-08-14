// Third party dependencies
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { backgroundState } from '../../../util/test/initial-root-state';

// Internal dependencies
import NetworkSelector from './NetworkSelector';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkListModal.selectors';

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
      setShowTestNetworks: jest.fn(),
    },
    CurrencyRateController: { updateExchangeRate: jest.fn() },
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
    const testNetworksSwitch = getByTestId(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );

    fireEvent(testNetworksSwitch, 'onValueChange', true);

    expect(setShowTestNetworksSpy).toBeCalled();
  });
  it('toggle test network is disabled and is on when a testnet is selected', () => {
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
});
