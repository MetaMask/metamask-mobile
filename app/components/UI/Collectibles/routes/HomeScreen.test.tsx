import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { HomeScreen } from './HomeScreen';

const mockGoBack = jest.fn();
let mockParams: { tab?: string } | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockParams = undefined;
  });

  it('shows the Collectibles header, the tabs and the Popular tab', () => {
    renderWithProvider(<HomeScreen />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.landingHero),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(collectiblesTestIds.tabBar)).toBeOnTheScreen();
  });

  it('opens the tab from the route param', () => {
    mockParams = { tab: 'marketplace' };

    renderWithProvider(<HomeScreen />);

    expect(
      screen.getByTestId(collectiblesTestIds.marketplaceView),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<HomeScreen />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.homeBackButton));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
