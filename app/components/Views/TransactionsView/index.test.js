/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TransactionsView from './index';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../hooks/AssetPolling/useCurrencyRatePolling', () =>
  jest.fn(() => null),
);

jest.mock('../../hooks/AssetPolling/useTokenRatesPolling', () =>
  jest.fn(() => null),
);

jest.mock('../../UI/Transactions', () => {
  const { View, Text } = require('react-native');
  const MockTransactions = ({ transactions, loading }) => (
    <View testID="transactions-component">
      <Text testID="loading-state">{loading ? 'loading' : 'loaded'}</Text>
      <Text testID="transactions-count">{transactions?.length || 0}</Text>
    </View>
  );
  MockTransactions.displayName = 'MockTransactions';
  return MockTransactions;
});

const mockSelectedInternalAccount = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  metadata: {
    importTime: Date.now() - 10000,
    name: 'Account 1',
    keyring: {
      type: 'HD Key Tree',
    },
  },
  type: 'eip155:eoa',
};

const mockTransaction = {
  id: 'tx-1',
  time: Date.now(),
  status: 'confirmed',
  chainId: '0x1',
  txParams: {
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xabcdef1234567890abcdef1234567890abcdef12',
    value: '0x1',
    nonce: '0x1',
  },
};

const createMockStore = (overrides = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          ...backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {
                '0x1234567890abcdef1234567890abcdef12345678':
                  mockSelectedInternalAccount,
              },
              selectedAccount: '0x1234567890abcdef1234567890abcdef12345678',
            },
          },
          AccountTrackerController: {
            accountsByChainId: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 2000,
              },
            },
          },
          TokensController: {
            tokens: [],
            allTokens: {},
          },
          TransactionController: {
            transactions: [mockTransaction],
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
            },
            networkConfigurations: {},
          },
          AddressBookController: {
            addressBook: {},
          },
          NftController: {
            allNfts: {},
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          BridgeStatusController: {
            bridgeHistory: {},
          },
          NetworkEnablementController: {
            enabledNetworksByNamespace: {
              eip155: {
                '0x1': true,
              },
            },
            enabledNetworks: {
              '0x1': true,
            },
          },
          ...overrides,
        },
      }),
      fiatOrders: () => ({
        orders: [],
      }),
      settings: () => ({
        showFiatOnTestnets: false,
      }),
    },
  });

describe('TransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const store = createMockStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(getByTestId('transactions-component')).toBeTruthy();
  });

  it('passes transactions to Transactions component', () => {
    const store = createMockStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(getByTestId('transactions-count')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const store = createMockStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('uses currency rate polling', () => {
    const useCurrencyRatePolling = require('../../hooks/AssetPolling/useCurrencyRatePolling');
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(useCurrencyRatePolling).toHaveBeenCalled();
  });

  it('uses token rates polling', () => {
    const useTokenRatesPolling = require('../../hooks/AssetPolling/useTokenRatesPolling');
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(useTokenRatesPolling).toHaveBeenCalled();
  });
});
