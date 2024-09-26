import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import TransactionsView from './';
import { NETWORK_ID_LOADING } from '../../../core/redux/slices/inpageProvider';
import { TX_CONFIRMED, TX_PENDING } from '../../../constants/transaction';

// Mock the dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../util/activity', () => ({
  filterByAddressAndNetwork: jest.fn(() => true),
  sortTransactions: jest.fn((txs) => txs),
}));

jest.mock('../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));

jest.mock('../../../core/Engine', () => ({
  state: {
    inpageProvider: {
      networkId: '1',
    },
  },
}));

// Mock the Transactions component
jest.mock('../../UI/Transactions', () => 'Transactions');

const mockStore = configureStore([thunk]);

describe('TransactionsView', () => {
  const initialState = {
    engine: {
      backgroundState: {
        CurrencyRateController: {
          conversionRate: 1,
          currentCurrency: 'USD',
        },
        AccountsController: {
          selectedInternalAccount: {
            address: '0x1234',
            metadata: { importTime: 1234567890 },
          },
        },
        NetworkController: {
          providerType: 'mainnet',
          chainId: '1',
        },
        TokensController: {
          tokens: [],
        },
        TransactionController: {
          transactions: [
            {
              id: '1',
              status: TX_CONFIRMED,
              time: 1000,
              txParams: { from: '0x1234', nonce: '0' },
            },
            {
              id: '2',
              status: TX_PENDING,
              time: 2000,
              txParams: { from: '0x1234', nonce: '1' },
            },
          ],
        },
        SmartTransactionsController: {
          pendingSmartTransactions: {},
        },
      },
    },
  };

  it('renders correctly when loading', () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    expect(getByTestId('transactions-loading')).toBeTruthy();
  });

  it('renders transactions after loading', async () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('transactions-view')).toBeTruthy();
    });
  });

  it('filters transactions correctly', async () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('transactions-view')).toBeTruthy();
    });

    const actions = store.getActions();
    const transactionsProps = actions.find(
      (action) =>
        action.type === 'RENDER_COMPONENT' &&
        action.payload.component === 'Transactions',
    ).payload.props;

    expect(transactionsProps.transactions).toHaveLength(1);
    expect(transactionsProps.submittedTransactions).toHaveLength(1);
    expect(transactionsProps.confirmedTransactions).toHaveLength(1);
  });

  it('does not filter transactions when network is loading', async () => {
    const loadingState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          inpageProvider: {
            networkId: NETWORK_ID_LOADING,
          },
        },
      },
    };
    const store = mockStore(loadingState);
    render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const actions = store.getActions();
    const transactionsProps = actions.find(
      (action) =>
        action.type === 'RENDER_COMPONENT' &&
        action.payload.component === 'Transactions',
    );

    expect(transactionsProps).toBeUndefined();
  });
});
