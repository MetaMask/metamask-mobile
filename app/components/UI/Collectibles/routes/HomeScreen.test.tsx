import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { HomeScreen } from './HomeScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the Collectibles header and the main page', () => {
    renderWithProvider(<HomeScreen />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.landingHero),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<HomeScreen />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.homeBackButton));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
