import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionsView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('TransactionsView', () => {
  it('should render correctly', () => {
    const initialState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                replacedBy: '0x123',
                replacedById: '0x123',
                hash: '0x123',
              },
            ],
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'account1',
              accounts: {
                account1: {
                  address: '0x123',
                  name: 'Account 1',
                  type: 'internal',
                },
              },
            },
          },
        },
      },
      settings: {
        showFiatOnTestnets: false,
      },
    };

    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
