import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import CollectibleMedia from './CollectibleMedia';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
// eslint-disable-next-line import/no-namespace
import * as AssetControllers from '@metamask/assets-controllers';

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

  it('should handle an nft with multiple images and render the first image', async () => {
    const images = [
      'ipfs://bafybeidgklvljyifilhtrxzh77brgnhcy6s2wxoxqc2l73zr2nxlwuxfcy',
      'ipfs://bafybeic26kitpujb3q5h5w7yovmvgmtxl3y4ldsb2pfgual5jq62emsmxq',
    ];

    const mockGetFormattedIpfsUrl = jest
      .spyOn(AssetControllers, 'getFormattedIpfsUrl')
      .mockResolvedValue(
        'https://bafybeidgklvljyifilhtrxzh77brgnhcy6s2wxoxqc2l73zr2nxlwuxfcy.ipfs.dweb.link',
      );

    const expectedUri =
      'https://bafybeidgklvljyifilhtrxzh77brgnhcy6s2wxoxqc2l73zr2nxlwuxfcy.ipfs.dweb.link';

    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: images,
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

    await new Promise((r) => setTimeout(r, 2000));

    await waitFor(() => {
      const elem = getByTestId('nft-image');
      expect(elem.props.source).toEqual({ uri: expectedUri });
      const mocksImageParam = mockGetFormattedIpfsUrl.mock.lastCall?.[1];
      expect(mocksImageParam).toBe(images[0]);
    });
  });
});
