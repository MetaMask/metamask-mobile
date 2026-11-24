import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { CollectiblesHomeScreen } from './CollectiblesHomeScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

describe('CollectiblesHomeScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockNavigate.mockClear();
  });

  it('shows the Collectibles header', () => {
    renderWithProvider(<CollectiblesHomeScreen />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it('shows the hero, the three buttons and the sections', () => {
    renderWithProvider(<CollectiblesHomeScreen />);

    expect(
      screen.getByTestId(collectiblesTestIds.landingHero),
    ).toBeOnTheScreen();
    for (const name of ['packs', 'collection', 'market']) {
      expect(
        screen.getByTestId(collectiblesTestIds.landingNavButton(name)),
      ).toBeOnTheScreen();
    }
    for (const name of ['just-opened', 'epic-vs-odds', 'greatest-hits']) {
      expect(
        screen.getByTestId(collectiblesTestIds.landingSection(name)),
      ).toBeOnTheScreen();
    }
    expect(
      screen.getByText(strings('collectibles.landing.just_opened')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.landing.epic_vs_odds')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.landing.greatest_hits')),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<CollectiblesHomeScreen />);

    // The design-system back button's default testID.
    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
