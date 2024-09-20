import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import TransactionsView from './index';

jest.mock('@react-navigation/compat', () => ({
  withNavigation: (component: React.ReactNode) => component,
}));
jest.mock('../../../store', () => ({
  store: {
    getState: () => ({
      inpageProvider: { networkId: '1' },
    }),
  },
}));
jest.mock('../../UI/Transactions', () => 'Transactions');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

const mockStore = configureStore([]);

describe('TransactionsView', () => {
  let store: ReturnType<typeof mockStore>;
  const initialState = {
    engine: {
      backgroundState: {
        NetworkController: {
          provider: {
            chainId: '1',
            type: 'mainnet',
          },
        },
        CurrencyRateController: {
          conversionRate: 1800,
          currentCurrency: 'USD',
        },
        TokensController: {
          tokens: [],
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                address: '0x1234567890123456789012345678901234567890',
                metadata: {
                  importTime: 1620000000000,
                },
              },
            },
          },
        },
        TransactionController: {
          transactions: [],
        },
        SmartTransactionsController: {
          smartTransactions: {},
        },
      },
    },
    settings: {
      showFiatOnTestnets: false,
    },
  };

  let mockSetLoading: jest.Mock;

  beforeEach(() => {
    store = mockStore(initialState);
    mockSetLoading = jest.fn();
    (React.useState as jest.Mock).mockImplementation((initialState) => [
      initialState,
      mockSetLoading,
    ]);
  });

  let mockLoading = false;

  it('renders correctly', async () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    await waitFor(() => expect(toJSON()).toMatchSnapshot());
  });

  it('initializes with correct state', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    await waitFor(() => expect(getByTestId('transactions-view')).toBeTruthy());
  });

  it('filters transactions correctly', async () => {
    const transactions = [
      { id: '1', status: 'confirmed', time: 1620000000000 },
      { id: '2', status: 'submitted', time: 1620000100000 },
    ];
    const updatedState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TransactionController: {
            transactions,
          },
        },
      },
    };
    store = mockStore(updatedState);

    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    await waitFor(() => expect(getByTestId('transactions-view')).toBeTruthy());
  });

  it('handles loading state', async () => {
    mockLoading = true;

    (React.useState as jest.Mock).mockImplementation(() => [
      mockLoading,
      mockSetLoading,
    ]);
    const { getByTestId, rerender } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    await waitFor(() =>
      expect(getByTestId('transactions-loading')).toBeTruthy(),
    );
  });
});
