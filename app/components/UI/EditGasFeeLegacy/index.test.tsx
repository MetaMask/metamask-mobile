import React from 'react';
import { shallow } from 'enzyme';
import EditGasFeeLegacy from '.';
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

describe('EditGasFeeLegacyUpdate', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <EditGasFeeLegacy view={'Test'} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
