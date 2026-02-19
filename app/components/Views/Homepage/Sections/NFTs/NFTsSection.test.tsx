import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import NFTsSection from './NFTsSection';
import Routes from '../../../../../constants/navigation/Routes';

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

describe('NFTsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders section title', () => {
    renderWithProvider(<NFTsSection />);

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('navigates to NFTs full view on title press', () => {
    renderWithProvider(<NFTsSection />);

    fireEvent.press(screen.getByText('NFTs'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.NFTS_FULL_VIEW);
  });
});
