import React from 'react';
import { render } from '@testing-library/react-native';
import ReceiveRequest from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  modals: {
    receiveAsset: {},
  },
  user: {
    seedphraseBackedUp: true,
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
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
