import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContracts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
          chainId: 1,
          type: 'mainnet',
        },
      },
      PreferencesController: {
        selectedAddress: '0x1',
      },
      NftController: {
        allNftContracts: {
          '0x1': {
            1: [
              {
                name: 'name',
                logo: 'logo',
                address: '0x0',
                symbol: 'NM',
                description: 'description',
                totalSupply: 10,
              },
            ],
          },
        },
        allNfts: {
          '0x1': {
            1: [
              {
                address: '0x0',
                tokenId: 10,
                name: 'name',
                image: 'image',
              },
            ],
          },
        },
      },
    },
  },
  user: {
    nftDetectionDismissed: true,
  },
};
const store = mockStore(initialState);

describe('CollectibleContracts', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContracts />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
