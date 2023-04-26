import React from 'react';
import { render } from '@testing-library/react-native';
import NetworksSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' },
      },
      PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] },
    },
  },
  privacy: {
    thirdPartyApiMode: true,
  },
};
const store = mockStore(initialState);

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NetworksSettings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
