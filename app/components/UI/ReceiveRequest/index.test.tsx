import React from 'react';
import { shallow } from 'enzyme';
import ReceiveRequest from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
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
    const wrapper = shallow(
      <Provider store={store}>
        <ReceiveRequest />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
