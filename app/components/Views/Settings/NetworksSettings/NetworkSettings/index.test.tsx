import React from 'react';
import { shallow } from 'enzyme';
import NetworkSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' },
      },
      PreferencesController: {
        frequentRpcList: [],
      },
    },
  },
  networkOnboarded: {
    networkOnboardedState: [{ network: 'mainnet', onboarded: true }],
  },
  privacy: {
    thirdPartyApiMode: true,
  },
};
const store = mockStore(initialState);

describe('NetworkSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
