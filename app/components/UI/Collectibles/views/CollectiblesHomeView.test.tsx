import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { CollectiblesHomeView } from './CollectiblesHomeView';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('CollectiblesHomeView', () => {
  it('shows the hero, the three buttons and the sections', () => {
    renderWithProvider(<CollectiblesHomeView />);

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
