import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { MarketScreen } from './MarketScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('MarketScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the Market header and the coming soon placeholder', () => {
    renderWithProvider(<MarketScreen />);

    expect(
      screen.getByText(strings('collectibles.landing.market')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.market.coming_soon')),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<MarketScreen />);

    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
