import React from 'react';
import { shallow } from 'enzyme';
import Collectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x0',
      },
      NetworkController: {
        provider: {
          type: 'mainnet',
          chainId: '1',
        },
      },
      NftController: {
        allNfts: {
          '0x0': {
            1: [
              {
                address: '0x0',
                name: 'collectible',
                tokenId: 0,
                image: 'image',
              },
            ],
          },
        },
      },
    },
  },
  modals: {
    collectibleContractModalVisible: false,
  },
};
const store = mockStore(initialState);

describe('Collectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Collectible route={{ params: { address: '0x1' } }} />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
