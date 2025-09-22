import React from 'react';
import AssetDetails from '.';
import configureMockStore from 'redux-mock-store';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import Engine from '../../../core/Engine';
import { TokenI } from '../../UI/Tokens/types';

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  getDecimalChainId: jest.fn(() => 1),
  isPortfolioViewEnabled: jest.fn(() => true),
}));

jest.mock('@react-navigation/compat', () => ({
  withNavigation: (Component: React.ComponentType) => Component,
}));

const MOCK_ADDRESS_1 = '0x0';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      ignoreTokens: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectLastSelectedEvmAccount: jest.fn(() => ({
    address: '0x0', // MOCK_ADDRESS_1
  })),
  selectSelectedInternalAccountAddress: jest.fn(() => '0x0'), // MOCK_ADDRESS_1
  selectSelectedInternalAccountFormattedAddress: jest.fn(() => '0x0'), // MOCK_ADDRESS_1
  selectSelectedAccountGroupInternalAccounts: jest.fn(() => []),
  selectInternalAccounts: jest.fn(() => ({})),
  selectSelectedInternalAccount: jest.fn(() => ({
    id: 'mock-account-id',
    address: '0x0',
  })),
}));

// Mock multichain accounts selectors
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountSections: jest.fn(() => []),
    selectAccountTreeControllerState: jest.fn(() => ({})),
  }),
);

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_1]: {
            [CHAIN_IDS.MAINNET]: {
              '0xAddress': '0xde0b6b3a7640000',
            },
          },
        },
      },
      TokensController: {
        tokens: [
          {
            address: '0xAddress',
            symbol: 'TKN',
            decimals: 18,
            aggregators: ['Metamask', 'CMC'],
          },
        ],
        tokensByChainId: {
          [CHAIN_IDS.MAINNET]: [
            {
              address: '0xAddress',
              symbol: 'TKN',
              decimals: 18,
              aggregators: ['Metamask', 'CMC'],
            },
          ],
        },
        allTokens: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS_1]: [
              {
                address: '0xAddress',
                symbol: 'TKN',
                decimals: 18,
                aggregators: ['Metamask', 'CMC'],
              },
            ],
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'id',
          accounts: {
            id: {
              address: MOCK_ADDRESS_1,
            },
          },
        },
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0xAddress': { price: 2 },
        },
        marketData: {
          '0xAddress': { price: 2 },
        },
      },
      CurrencyRateController: {
        conversionRate: 1,
        currentCurrency: 'USD',
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const store = mockStore(initialState);

const mockAsset = {
  address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
  balanceFiat: '$11.89',
  chainId: '0x89',
  decimals: 6,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/137/0x750e4c4984a9e0f12978ea6742bc1c5d248f40ed.png',
  isETH: false,
  isNative: false,
};

describe('AssetDetails', () => {
  const renderComponent = () =>
    render(
      <Provider store={store}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

  it('renders correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders token details correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Token')).toBeDefined();
    expect(getByText('Token Amount')).toBeDefined();
    expect(getByText('Token contract address')).toBeDefined();
    expect(getByText('Token decimal')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Token Lists')).toBeDefined();
  });

  it('copies address to clipboard and shows alert', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    const copyElement = getByText('0xAddre...dress');
    fireEvent.press(copyElement);

    await waitFor(() => {
      expect(
        Engine.context.TokensController.ignoreTokens,
      ).not.toHaveBeenCalled();
    });
  });

  it('navigates to asset hide confirmation on pressing hide button', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Hide token'));

    await waitFor(() => {
      expect(
        Engine.context.TokensController.ignoreTokens,
      ).not.toHaveBeenCalled();
    });
  });

  it('renders warning banner if balance is undefined', () => {
    const mockEmptyState = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenBalancesController: {
            tokenBalances: {},
          },
        },
      },
    };

    const mockStoreEmpty = mockStore(mockEmptyState);

    const { getByText } = render(
      <Provider store={mockStoreEmpty}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    expect(getByText('troubleshooting missing balances')).toBeDefined();
  });

  it('renders balance in ETH if primary currency is ETH', () => {
    const { getByText } = renderComponent();
    expect(getByText('1')).toBeDefined();
  });

  it('renders balance in fiat if primary currency is fiat', () => {
    const mockFiatState = {
      ...initialState,
      settings: {
        primaryCurrency: 'fiat',
      },
    };
    const mockStoreFiat = mockStore(mockFiatState);

    const { getByText } = render(
      <Provider store={mockStoreFiat}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    expect(getByText('1')).toBeDefined();
  });
});
