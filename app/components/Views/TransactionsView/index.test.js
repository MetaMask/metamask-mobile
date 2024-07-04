import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionsView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            '0x1': { address: '0x1', balance: '100' },
          },
          selectedAccount: '0x1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('TransactionsView', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
