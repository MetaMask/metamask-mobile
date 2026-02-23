import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokensSection from './TokensSection';
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

describe('TokensSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders section title', () => {
    renderWithProvider(<TokensSection />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('navigates to tokens full view on title press', () => {
    renderWithProvider(<TokensSection />);

    fireEvent.press(screen.getByText('Tokens'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.TOKENS_FULL_VIEW);
  });
});
