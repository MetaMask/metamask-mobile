import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import CollectibleMedia from './CollectibleMedia';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => mockInitialState),
}));
const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

describe('CollectibleMedia', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'IMAGE',
          imagePreview: 'IMAGE',
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI:
            'ipfs://QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7',
          description: '123',
          standard: 'ERC721',
        }}
      />,
      { state: mockInitialState },
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should render collectible image if the ipfs gateway is enabled and display nft media is enabled', () => {
    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'https://',
          imagePreview: 'https://',
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI:
            'ipfs://QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7',
          description: '123',
          standard: 'ERC721',
        }}
      />,
      { state: mockInitialState },
    );

    const fallbackCollectible = getByTestId('nft-image');
    expect(fallbackCollectible).toBeDefined();
  });
});
