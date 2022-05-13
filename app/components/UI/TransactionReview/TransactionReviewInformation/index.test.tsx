import React from 'react';
import TransactionReviewInformation from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x2',
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        conversionRate: 0.1,
      },
      NetworkController: {
        provider: {
          ticker: 'ETH',
        },
      },
    },
  },
  transaction: {
    value: '',
    data: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};
const store = mockStore(initialState);

describe('TransactionReviewInformation', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewInformation EIP1559GasData={{}} />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
