import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesMarketScreen } from './CollectiblesMarketScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('CollectiblesMarketScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the Market header and the coming soon placeholder', () => {
    renderWithProvider(<CollectiblesMarketScreen />);

    expect(
      screen.getByText(strings('collectibles.landing.market')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.market.coming_soon')),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<CollectiblesMarketScreen />);

    // The design-system back button's default testID.
    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
