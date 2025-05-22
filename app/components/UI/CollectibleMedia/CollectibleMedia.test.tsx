import React from 'react';
import { waitFor, screen } from '@testing-library/react-native';
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

  it('should render fallback image when image source is not available', () => {
    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: '',
          imagePreview: '',
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI: '',
          description: '123',
          standard: 'ERC721',
          chainId: 1,
          error: undefined,
        }}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId('fallback-nft-with-token-id')).toBeTruthy();
    expect(screen.getByText('#123')).toBeTruthy();
  });

  it('should format long token IDs correctly', () => {
    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: '',
          imagePreview: '',
          tokenId: '12345678901234567890',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI: '',
          description: '123',
          standard: 'ERC721',
          chainId: 1,
          error: undefined,
        }}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId('fallback-nft-with-token-id')).toBeTruthy();
    expect(screen.getByText('#12...7000')).toBeTruthy();
  });

  it('should handle IPFS URIs correctly', async () => {
    const ipfsUri = 'ipfs://QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7';
    jest
      .spyOn(AssetControllers, 'getFormattedIpfsUrl')
      .mockResolvedValue(
        'https://ipfs.io/ipfs/QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7',
      );

    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: ipfsUri,
          imagePreview: ipfsUri,
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI: ipfsUri,
          description: '123',
          standard: 'ERC721',
          chainId: 1,
        }}
      />,
      { state: mockInitialState },
    );

    await waitFor(() => {
      const image = getByTestId('nft-image');
      expect(image.props.source.uri).toBe(
        'https://ipfs.io/ipfs/QmXt7k3uoihWSyzduXErHFGTTQ3a9rnokzw9s4ywKXKsA7',
      );
    });
  });

  it('should render different size variants correctly', () => {
    const { getByTestId, rerender } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'https://example.com/image.jpg',
          imagePreview: 'https://example.com/preview.jpg',
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI: 'https://example.com/token',
          description: '123',
          standard: 'ERC721',
          chainId: 1,
        }}
        tiny
      />,
      { state: mockInitialState },
    );

    expect(getByTestId('nft-image').props.style).toContainEqual({
      width: 32,
      height: 32,
    });

    rerender(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'https://example.com/image.jpg',
          imagePreview: 'https://example.com/preview.jpg',
          tokenId: '123',
          address: '0x123',
          backgroundColor: 'red',
          tokenURI: 'https://example.com/token',
          description: '123',
          standard: 'ERC721',
          chainId: 1,
        }}
        big
      />,
    );

    expect(getByTestId('nft-image').props.style).toContainEqual({
      width: 260,
      height: 260,
    });
  });
});
