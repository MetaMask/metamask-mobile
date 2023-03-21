import React from 'react';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import ApproveTransactionHeader from './';

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
          networkType: 'ethereum',
          nickname: 'ethereum',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('ApproveTransactionHeader', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ApproveTransactionHeader origin="0x" from="0x" url="" />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
