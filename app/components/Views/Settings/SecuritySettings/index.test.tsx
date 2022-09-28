import React from 'react';
import { shallow } from 'enzyme';
import SecuritySettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x',
        identities: { '0x': { name: 'Account 1' } },
      },
      AccountTrackerController: { accounts: {} },
      KeyringController: {
        keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
      },
      NetworkController: {
        provider: {
          type: 'mainnet',
        },
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};
const store = mockStore(initialState);

describe('SecuritySettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SecuritySettings />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
