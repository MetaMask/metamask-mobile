import React from 'react';
import TransactionEditor from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      CurrencyRateController: {
        conversionRate: 621.92,
      },
      TokenBalancesController: {
        contractBalances: { '0x2': new BN(0) },
      },
      PreferencesController: {
        selectedAddress: '0x0',
      },
      TokensController: {
        tokens: [],
      },
      NftController: {
        allNfts: { '0x0': { 1: [] } },
      },
      NetworkController: {
        provider: {
          type: 'mainnet',
          chainId: '1',
        },
      },
      GasFeeController: {
        gasEstimates: {},
      },
    },
  },
  transaction: {
    value: 0,
    data: '0x0',
    gas: 0,
    gasPrice: 1,
    from: '0x0',
    to: '0x1',
  },
  settings: {
    primaryCurrency: 'fiat',
  },
};
const store = mockStore(initialState);

describe('TransactionEditor', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionEditor />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
