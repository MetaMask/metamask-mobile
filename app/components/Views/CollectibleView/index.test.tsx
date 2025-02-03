import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import CollectibleView from './';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  modals: {
    collectibleContractModalVisible: false,
  },
};
const store = mockStore(initialState);

describe('CollectibleView', () => {
  const collectibleData = {
    address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
    description:
      'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
    error: 'Opensea import error',
    favorite: false,
    image: 'https://api.pudgypenguins.io/lil/image/11222',
    isCurrentlyOwned: true,
    name: 'Lil Pudgy #113',
    standard: 'ERC721',
    tokenId: '113',
    tokenURI: 'https://api.pudgypenguins.io/lil/113',
  };
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleView route={{ params: collectibleData }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
