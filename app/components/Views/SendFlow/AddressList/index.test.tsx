import React from 'react';
import { shallow } from 'enzyme';
import AddressList from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  recents: ['0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b'],
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        provider: {
          chainId: '1',
        },
      },
      AddressBookController: {
        addressBook: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            chainId: '1',
            isEns: false,
            memo: '',
            name: 'aa',
          },
        },
      },
      PreferencesController: {
        identities: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            name: 'Account 1',
          },
        },
      },
      TransactionController: {
        transactions: [],
      },
    },
  },
};
const store = mockStore(initialState);

describe('AddressList', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddressList inputSearch="" />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
