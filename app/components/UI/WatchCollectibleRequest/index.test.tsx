import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';
import { ROPSTEN } from '../../../constants/network';
import WatchCollectibleRequest from './';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        contractBalances: { '0x2': new BN(0) },
      },
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      },
      NetworkController: {
        provider: {
          type: ROPSTEN,
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('WatchCollectibleRequest', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <WatchCollectibleRequest
          suggestedCollectibleMeta={{
            collectible: {
              address: '0xf5de760f2e916647fd33b4ad9e85ff443ce3a2d',
              tokenId: '417',
            },
          }}
        />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
