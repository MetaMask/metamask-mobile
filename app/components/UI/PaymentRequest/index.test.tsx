import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentRequest from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('PaymentRequest', () => {
  it('should render correctly', () => {
    const initialState = {
      engine: {
        backgroundState: {
          TransactionController: {},
          TokenRatesController: {
            marketData: {},
          },
        },
      },
      accountsController: {
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
      settings: {
        showFiatOnTestnets: false,
      },
    };

    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <PaymentRequest />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
