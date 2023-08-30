import React from 'react';

import CollectibleMedia from './CollectibleMedia';

import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
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
          tokenId: 123,
          address: '0x123',
          backgroundColor: 'red',
        }}
      />,
      { state: mockInitialState },
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should render fallback if Ipfs gateway is disabled', () => {
    const initialState = {
      engine: {
        backgroundState: {
          PreferencesController: { isIpfsGatewayEnabled: false },
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'ipfs://',
          imagePreview: 'ipfs://',
          tokenId: 123,
          address: '0x123',
          backgroundColor: 'red',
        }}
      />,
      { state: initialState },
    );

    const fallbackCollectible = getByTestId('fallback-nft-ipfs');
    expect(fallbackCollectible).toBeDefined();
  });

  it('should render collectible image if the ipfs gateway is enabled', () => {
    const { getByTestId } = renderWithProvider(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'https://',
          imagePreview: 'https://',
          tokenId: 123,
          address: '0x123',
          backgroundColor: 'red',
        }}
      />,
      { state: mockInitialState },
    );

    const fallbackCollectible = getByTestId('nft-image');
    expect(fallbackCollectible).toBeDefined();
  });
});
