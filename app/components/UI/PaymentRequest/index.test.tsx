import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentRequest from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const initialState = {
  settings: {
    showFiatOnTestnets: true,
  },
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currencyRates: {},
        currentCurrency: 'USD',
      },
    },
  },
};
const store = mockStore(initialState);

describe('PaymentRequest', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <PaymentRequest />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
