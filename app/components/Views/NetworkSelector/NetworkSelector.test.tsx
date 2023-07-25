// Third party dependencies
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

// Internal dependencies
import NetworkSelector from './NetworkSelector';

const mockEngine = Engine;

const setRpcTargetSpy = jest.spyOn(
  Engine.context.NetworkController,
  'setRpcTarget',
);

const setShowTestNetworksSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setShowTestNetworks',
);

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    NetworkController: { setRpcTarget: jest.fn() },
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
      SwapsController: {
        tokens: [],
      },
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
      },
      CurrencyRateController: {
        conversionRate: 5,
        currentCurrency: 'usd',
      },
      TokensController: {
        tokens: [],
      },
      PreferencesController: {
        showTestNetworks: false,
        selectedAddress: '0x',
        identities: {
          '0x': { name: 'Account 1', address: '0x' },
        },
        frequentRpcList: [
          {
            chainId: '43114',
            nickname: 'Avalanche Mainnet C-Chain',
            rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            ticker: 'AVAX',
          },
          {
            chainId: '137',
            nickname: 'Polygon Mainnet',
            rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
            rpcUrl:
              'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
            ticker: 'MATIC',
          },
          {
            chainId: '10',
            nickname: 'Optimism',
            rpcPrefs: { blockExplorerUrl: 'https://optimistic.etherscan.io' },
            rpcUrl:
              'https://optimism-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
            ticker: 'ETH',
          },
          {
            chainId: '100',
            nickname: 'Gnosis Chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://blockscout.com/xdai/mainnet/',
            },
            rpcUrl: 'https://rpc.gnosischain.com/',
            ticker: 'XDAI',
          },
        ],
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      TokenListController: {
        tokenList: {},
      },
      TokenRatesController: {
        contractExchangeRates: {},
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

    expect(setRpcTargetSpy).toBeCalled();
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
          SwapsController: {
            tokens: [],
          },
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
              nickname: 'Goerli mainnet',
              ticket: 'eth',
              chainId: '5',
            },
          },
          CurrencyRateController: {
            conversionRate: 5,
            currentCurrency: 'usd',
          },
          TokensController: {
            tokens: [],
          },
          PreferencesController: {
            showTestNetworks: false,
            selectedAddress: '0x',
            identities: {
              '0x': { name: 'Account 1', address: '0x' },
            },
            frequentRpcList: [
              {
                chainId: '43114',
                nickname: 'Avalanche Mainnet C-Chain',
                rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
                rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                ticker: 'AVAX',
              },
              {
                chainId: '137',
                nickname: 'Polygon Mainnet',
                rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                rpcUrl:
                  'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                ticker: 'MATIC',
              },
              {
                chainId: '10',
                nickname: 'Optimism',
                rpcPrefs: {
                  blockExplorerUrl: 'https://optimistic.etherscan.io',
                },
                rpcUrl:
                  'https://optimism-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                ticker: 'ETH',
              },
              {
                chainId: '59140',
                nickname: 'Linea Goerli Test Network',
                rpcPrefs: {
                  blockExplorerUrl: 'https://explorer.goerli.linea.build',
                },
                rpcUrl: 'https://rpc.goerli.linea.build/',
                ticker: 'LineaETH',
              },
              {
                chainId: '100',
                nickname: 'Gnosis Chain',
                rpcPrefs: {
                  blockExplorerUrl: 'https://blockscout.com/xdai/mainnet/',
                },
                rpcUrl: 'https://rpc.gnosischain.com/',
                ticker: 'XDAI',
              },
            ],
          },
          TokenBalancesController: {
            contractBalances: {},
          },
          TokenListController: {
            tokenList: {},
          },
          TokenRatesController: {
            contractExchangeRates: {},
          },
          NftController: {
            allNfts: { '0x': { '1': [] } },
            allNftContracts: { '0x': { '1': [] } },
          },
        },
      },
    });
    const testNetworksSwitch = getByTestId('test-network-switch-id');

    expect(testNetworksSwitch.props.value).toBeTruthy();
    expect(testNetworksSwitch.props.disabled).toBeTruthy();
  });
});
