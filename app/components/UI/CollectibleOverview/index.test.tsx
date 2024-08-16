import React from 'react';
import CollectibleOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

describe('CollectibleOverview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleOverview
          collectible={{
            name: 'Leopard',
            tokenId: 6904,
            address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
            externalLink: 'https://nft.example.com',
            tradable: true,
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
