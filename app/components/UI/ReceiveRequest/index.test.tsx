import React from 'react';
import { shallow } from 'enzyme';
import ReceiveRequest from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: { selectedAddress: '0x' },
      NetworkController: { network: '1', provider: { ticker: 'ETH' } },
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
    const wrapper = shallow(
      <Provider store={store}>
        <ReceiveRequest />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
