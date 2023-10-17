import React from 'react';
import { shallow } from 'enzyme';
import AccountOverview from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AccountOverview', () => {
  it('should render correctly', () => {
    const account = {
      address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      balanceFiat: 1604.2,
      label: 'Account 1',
    };
    const wrapper = shallow(
      <Provider store={store}>
        <AccountOverview account={account} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
