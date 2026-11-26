import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { EpicHuntPack } from '#app/components/UI/Collectibles/types/packs';
import { EpicHuntSection } from '#app/components/UI/Collectibles/components/EpicHuntSection';

let mockResult: { data: EpicHuntPack[]; isPending: boolean };

jest.mock('#app/components/UI/Collectibles/hooks/useEpicHuntPacks', () => ({
  useEpicHuntPacks: () => mockResult,
}));

const pack: EpicHuntPack = {
  code: 'pack-1',
  name: 'Lorem ipsum',
  subtitle: 'Epic 1% · 32 pulls since last Epic',
  openedCount: 48210,
  priceLabel: '$25.00',
  pullsOverAverage: -68,
};

describe('EpicHuntSection', () => {
  beforeEach(() => {
    mockResult = { data: [pack], isPending: false };
  });

  it('shows skeleton tiles while loading', () => {
    mockResult = { data: [], isPending: true };
    render(<EpicHuntSection />);

    expect(screen.getByTestId(collectiblesTestIds.skeleton)).toBeOnTheScreen();
  });

  it('shows the empty state when no pack qualifies', () => {
    mockResult = { data: [], isPending: false };
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
      screen.getByTestId(collectiblesTestIds.epicHuntGauge(pack.code)),
    ).toBeOnTheScreen();
    expect(screen.getByText('-68')).toBeOnTheScreen();
    expect(screen.queryByText('48,210')).not.toBeOnTheScreen();
  });

  it('signs a gauge above the average', () => {
    mockResult = {
      data: [{ ...pack, pullsOverAverage: 12 }],
      isPending: false,
    };
    render(<EpicHuntSection />);

    expect(screen.getByText('+12')).toBeOnTheScreen();
  });

  it('shows an unsigned zero at the average', () => {
    mockResult = { data: [{ ...pack, pullsOverAverage: 0 }], isPending: false };
    render(<EpicHuntSection />);

    expect(screen.getByText('0')).toBeOnTheScreen();
  });

  it('opens the info sheet from the info icon', () => {
    render(<EpicHuntSection />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.epicHuntInfoButton));

    expect(
      screen.getByText(strings('collectibles.epic_hunt.info_independent')),
    ).toBeOnTheScreen();
  });

  it('closes the info sheet from its close button', async () => {
    render(<EpicHuntSection />);
    fireEvent.press(screen.getByTestId(collectiblesTestIds.epicHuntInfoButton));

    fireEvent.press(screen.getByTestId(collectiblesTestIds.epicHuntInfoClose));

    await waitFor(() =>
      expect(
        screen.queryByText(strings('collectibles.epic_hunt.info_independent')),
      ).not.toBeOnTheScreen(),
    );
  });
});
