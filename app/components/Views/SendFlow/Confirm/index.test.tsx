import React from 'react';
import { shallow } from 'enzyme';
import Confirm from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        provider: {
          ticker: 'ETH',
          type: 'mainnet',
        },
      },
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      TransactionController: {
        transactions: [],
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      PreferencesController: {
        identities: {},
      },
      KeyringController: {
        keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
      },
      GasFeeController: {
        gasEstimates: {},
      },
    },
  },
  settings: {
    showHexData: true,
  },
  transaction: {
    selectedAsset: {},
    transaction: {
      from: '0x1',
      to: '0x2',
    },
  },
};
const store = mockStore(initialState);

describe('Confirm', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Confirm />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
