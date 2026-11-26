import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { PopularView } from './PopularView';

jest.mock('#app/components/UI/Collectibles/hooks/useEpicOddsPacks', () => ({
  useEpicOddsPacks: () => ({ packs: [], isPending: true }),
}));

describe('PopularView', () => {
  it('shows the hero and the sections', () => {
    renderWithProvider(<PopularView />);

    expect(
      screen.getByTestId(collectiblesTestIds.landingHero),
    ).toBeOnTheScreen();
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
