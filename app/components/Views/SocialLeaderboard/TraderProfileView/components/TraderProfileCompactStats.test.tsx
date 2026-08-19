import React from 'react';
import { screen } from '@testing-library/react-native';
import type { TraderStats } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
import TraderProfileCompactStats from './TraderProfileCompactStats';

const baseStats: TraderStats = {
  pnl7d: 20610,
  winRate7d: 0.92,
  roiPercent7d: 1.5,
  tradeCount30d: 48,
};

describe('TraderProfileCompactStats', () => {
  it('renders win rate and 7D PnL', () => {
    renderWithProvider(<TraderProfileCompactStats stats={baseStats} />);

    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.COMPACT_STATS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE),
    ).toHaveTextContent('92%');
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('+$20,610');
  });

  it('renders dashes when stats are null', () => {
    const stats = {
      ...baseStats,
      winRate7d: null,
      pnl7d: null,
    } as unknown as TraderStats;

    renderWithProvider(<TraderProfileCompactStats stats={stats} />);

    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE),
    ).toHaveTextContent('\u2014');
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('\u2014');
  });
});
