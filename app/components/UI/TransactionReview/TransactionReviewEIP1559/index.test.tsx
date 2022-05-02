import React from 'react';
import TransactionReviewEIP1559 from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'usd',
        conversionRate: 0.1,
      },
      NetworkController: {
        provider: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('TransactionReviewEIP1559', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewEIP1559 />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
