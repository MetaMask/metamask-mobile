import React from 'react';
import { render } from '@testing-library/react-native';
import Approve from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  transaction: {},
  settings: {
    primaryCurrency: 'Fiat',
  },
  browser: {
    activeTab: 1592878266671,
    tabs: [{ id: 1592878266671, url: 'https://metamask.github.io/test-dapp/' }],
  },
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      NetworkController: {
        providerConfig: {
          ticker: 'ETH',
        },
      },
      TransactionController: {
        transactions: [],
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 100,
      },
      PreferencesController: {
        selectedAddress: '0x1',
        identities: { '0x1': { name: 'Account 1' } },
      },
      TokenBalancesController: {
        contractBalances: { '0x2': new BN(0) },
      },
      TokensController: {
        tokens: [],
      },
      GasFeeController: {
        gasEstimates: {},
      },
    },
  },
};
const store = mockStore(initialState);

describe('Approve', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Approve />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
