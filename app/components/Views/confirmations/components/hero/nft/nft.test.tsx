import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HeroNft } from './nft';
import { MOCK_STATE_NFT } from '../../../../../../util/test/mock-data/root-state/nft';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('HeroNft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder when image is not provided', () => {
    const { getByText } = renderWithProvider(<HeroNft />, {
      state: MOCK_STATE_NFT,
    });

    expect(getByText('Show')).toBeDefined();
  });

  it('navigates to full image view when placeholder is pressed', () => {
    const { getByTestId } = renderWithProvider(<HeroNft />, {
      state: MOCK_STATE_NFT,
    });

    fireEvent.press(getByTestId('hero-nft-placeholder'));
    expect(mockNavigate).toHaveBeenCalledWith('NftDetailsFullImage', {
      collectible: undefined,
    });
  });
});
