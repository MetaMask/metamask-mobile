import React from 'react';
import { shallow } from 'enzyme';
import SendTo from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  settings: {
    primaryCurrency: 'fiat',
  },
  transaction: {
    selectedAsset: {},
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

describe('SendTo', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SendTo />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
