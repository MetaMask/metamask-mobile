import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkList from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  privacy: {
    approvedHosts: {},
  },
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' },
      },
      PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] },
    },
  },
  networkOnboarded: {
    networkOnboardedState: [{ network: 'mainnet', onboarded: true }],
  },
  modals: {
    shouldNetworkSwitchPopToWallet: false,
  },
  navigation: {
    currentBottomNavRoute: 'Wallet',
  },
};
const store = mockStore(initialState);

describe('NetworkList', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NetworkList />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
