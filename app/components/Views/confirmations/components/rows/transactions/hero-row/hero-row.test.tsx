import React from 'react';
import { render } from '@testing-library/react-native';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';
import { HeroRow } from './hero-row';

jest.mock('../../../../hooks/nft/useIsNft');
jest.mock('../../../hero-token', () => ({ HeroToken: jest.fn(() => null) }));
jest.mock('../../../hero-nft', () => ({ HeroNft: jest.fn(() => null) }));

describe('HeroRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render HeroNft when isNft is true', () => {
    (useIsNft as jest.Mock).mockReturnValue({ isNft: true });

    render(<HeroRow />);
    expect(HeroNft).toHaveBeenCalled();
    expect(HeroToken).not.toHaveBeenCalled();
  });

  it('should render HeroToken when isNft is false', () => {
    (useIsNft as jest.Mock).mockReturnValue({ isNft: false });

    render(<HeroRow />);
    expect(HeroToken).toHaveBeenCalled();
    expect(HeroNft).not.toHaveBeenCalled();
  });
});
