import React from 'react';
import { render } from '@testing-library/react-native';
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
        providerConfig: {
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
    const { toJSON } = render(
      <Provider store={store}>
        <Collectible route={{ params: { address: '0x1' } }} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
