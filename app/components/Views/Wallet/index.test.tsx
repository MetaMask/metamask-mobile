import React from 'react';
import { shallow } from 'enzyme';
import Wallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0xe7E125654064EEa56229f273dA586F10DF96B0a1': {
            name: 'account 1',
            address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
            balance: 0,
          },
        },
      },
    },
  },
});
describe('Wallet', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Wallet />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
