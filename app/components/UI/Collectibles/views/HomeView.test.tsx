import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { HomeView } from './HomeView';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('HomeView', () => {
  it('shows the hero, the three buttons and the sections', () => {
    renderWithProvider(<HomeView />);

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
});
