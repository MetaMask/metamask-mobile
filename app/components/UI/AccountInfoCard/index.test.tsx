import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import AccountInfoCard from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          address: '0x0',
          name: 'Account 1',
        },
      },
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'inr',
      },
      NetworkController: {
        provider: {
          ticker: 'eth',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AccountInfoCard', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AccountInfoCard />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
