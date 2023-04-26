import React from 'react';
import { render } from '@testing-library/react-native';
import ReceiveRequest from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: { selectedAddress: '0x' },
      NetworkController: { network: '1', providerConfig: { ticker: 'ETH' } },
    },
  },
  modals: {
    receiveAsset: {},
  },
  user: {
    seedphraseBackedUp: true,
  },
};
const store = mockStore(initialState);

describe('ReceiveRequest', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ReceiveRequest />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
