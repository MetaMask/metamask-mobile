import React from 'react';
import { shallow } from 'enzyme';
import WatchAssetRequest from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';
import { SEPOLIA } from '../../../constants/network';

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
        providerConfig: {
          type: SEPOLIA,
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('WatchAssetRequest', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <WatchAssetRequest
          suggestedAssetMeta={{
            asset: { address: '0x2', symbol: 'TKN', decimals: 0 },
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
