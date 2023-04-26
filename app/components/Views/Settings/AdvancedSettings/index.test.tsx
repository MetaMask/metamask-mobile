import React from 'react';
import { render } from '@testing-library/react-native';
import AdvancedSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  settings: { showHexData: true },
  engine: {
    backgroundState: {
      PreferencesController: {
        ipfsGateway: 'https://ipfs.io/ipfs/',
        disabledRpcMethodPreferences: {
          eth_sign: false,
        },
      },
      NetworkController: {
        providerConfig: { chainId: '1' },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AdvancedSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AdvancedSettings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
