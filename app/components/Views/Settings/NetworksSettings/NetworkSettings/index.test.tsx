import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' },
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
    const { toJSON } = render(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
