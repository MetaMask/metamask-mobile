import React from 'react';
import { render } from '@testing-library/react-native';
import EditGasFeeLegacyUpdate from './';
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
        providerConfig: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('EditGasFeeLegacyUpdate', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <EditGasFeeLegacyUpdate view={'Test'} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
