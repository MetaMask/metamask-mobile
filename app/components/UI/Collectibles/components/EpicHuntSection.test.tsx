import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { EpicOddsPack } from '#app/components/UI/Collectibles/types/packs';
import { EpicHuntSection } from '#app/components/UI/Collectibles/components/EpicHuntSection';

let mockResult: { packs: EpicOddsPack[]; isPending: boolean };

jest.mock('#app/components/UI/Collectibles/hooks/useEpicOddsPacks', () => ({
  useEpicOddsPacks: () => mockResult,
}));

const pack: EpicOddsPack = {
  code: 'pack-1',
  name: 'Lorem ipsum',
  subtitle: 'Epic 1% · 32 pulls since last Epic',
  openedCount: 48210,
  priceLabel: '$25.00',
  gaugeValue: -68,
};

describe('EpicHuntSection', () => {
  beforeEach(() => {
    mockResult = { packs: [pack], isPending: false };
  });

  it('shows skeleton tiles while loading', () => {
    mockResult = { packs: [], isPending: true };
    render(<EpicHuntSection />);

    expect(screen.getByTestId(collectiblesTestIds.skeleton)).toBeOnTheScreen();
  });

  it('shows the empty state when no pack qualifies', () => {
    mockResult = { packs: [], isPending: false };
    render(<EpicHuntSection />);

    expect(
      screen.getByText(strings('collectibles.home.empty')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.home.empty_description')),
    ).toBeOnTheScreen();
  });

  it('shows the Epic line in place of the social cue', () => {
    render(<EpicHuntSection />);

    expect(
      screen.getByText('Epic 1% · 32 pulls since last Epic'),
    ).toBeOnTheScreen();
  });

  it('shows the gauge in place of the pack counter', () => {
    render(<EpicHuntSection />);

    expect(
      screen.getByTestId(collectiblesTestIds.epicOddsGauge(pack.code)),
    ).toBeOnTheScreen();
    expect(screen.getByText('-68')).toBeOnTheScreen();
    expect(screen.queryByText('48,210')).not.toBeOnTheScreen();
  });

  it('signs a gauge above the average', () => {
    mockResult = { packs: [{ ...pack, gaugeValue: 12 }], isPending: false };
    render(<EpicHuntSection />);

    expect(screen.getByText('+12')).toBeOnTheScreen();
  });

  it('opens the info sheet from the info icon', () => {
    render(<EpicHuntSection />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.epicOddsInfoButton));

    expect(
      screen.getByText(strings('collectibles.epic_vs_odds.info_independent')),
    ).toBeOnTheScreen();
  });
});
