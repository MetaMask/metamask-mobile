import React from 'react';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import configureMockStore from 'redux-mock-store';
import VerifyContractDetails from './VerifyContractDetails';

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '1',
        },
      },
      TokensController: {
        tokens: [],
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {},
      TokenBalancesController: {
        contractBalance: {},
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const mockStore = configureMockStore();
const store = mockStore(initialState);
describe('VerifyContractDetails', () => {
  it('should show the token symbol', () => {
    const { getByText } = renderWithProvider(
      <Provider store={store}>
        <VerifyContractDetails tokenSymbol="dummy" />
      </Provider>,
      { state: store },
    );
    expect(getByText('dummy')).toBeDefined();
  });
});
