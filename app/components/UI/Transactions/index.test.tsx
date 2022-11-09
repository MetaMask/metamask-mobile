jest.useFakeTimers();

import React from 'react';
import Transactions from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0xbar': {
            name: 'Account 1',
            address: '0x0',
            importTime: Date.now(),
          },
        },
      },
      AccountTrackerController: {
        accounts: {},
      },
      TokensController: {
        tokens: [],
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      NftController: {
        allNftContracts: { '0x0': { 1: [] } },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      NetworkController: {
        provider: {
          chainId: '1',
        },
      },
      GasFeeController: {
        gasFeeEstimates: {
          high: {},
          medium: {},
          low: {},
        },
      },
    },
  },
  privacy: {
    thirdPartyApiMode: true,
  },
  settings: {
    primaryCurrency: 'USD',
  },
};
const store = mockStore(initialState);

describe('Transactions', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Transactions
          transactions={[
            {
              blockNumber: '5108051',
              id: '95305900-3b10-11e9-af59-6f4c0e36ce5f',
              networkID: '3',
              status: 'confirmed',
              time: 1551327802000,
              transaction: {
                data: '0x',
                from: '0xb2d191b6fe03c5b8a1ab249cfe88c37553357a23',
                gas: '0x5208',
                gasPrice: '0x37e11d600',
                nonce: '0x2e',
                to: '0xe46abaf75cfbff815c0b7ffed6f02b0760ea27f1',
                value: '0xfa1c6d5030000',
              },
              transactionHash:
                '0x79ce2d56aaa4735b2bb602ae3a501d9055350a6ec3fb3bd457ba18e8fa4aa2ae',
            },
          ]}
          loading={false}
        />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
