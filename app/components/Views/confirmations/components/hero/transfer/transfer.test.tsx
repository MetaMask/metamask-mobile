import React from 'react';
import { render } from '@testing-library/react-native';
import { useIsNft } from '../../../hooks/nft/useIsNft';
import TokenHero from '../../rows/transactions/token-hero';
import { HeroNft } from '../nft/nft';
import { HeroTransfer } from './transfer';

jest.mock('../../../hooks/nft/useIsNft');
jest.mock('../../rows/transactions/token-hero', () => jest.fn(() => null));
jest.mock('./nft/nft', () => ({ HeroNft: jest.fn(() => null) }));

describe('HeroTransfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render HeroNft when isNft is true', () => {
    (useIsNft as jest.Mock).mockReturnValue({ isNft: true });

    render(<HeroTransfer />);
    expect(HeroNft).toHaveBeenCalled();
    expect(TokenHero).not.toHaveBeenCalled();
  });

  it('should render TokenHero when isNft is false', () => {
    (useIsNft as jest.Mock).mockReturnValue({ isNft: false });

    render(<HeroTransfer />);
    expect(TokenHero).toHaveBeenCalled();
    expect(HeroNft).not.toHaveBeenCalled();
  });
});
