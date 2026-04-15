import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StatsRow from './StatsRow';
import type { TraderStats } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';

const baseStats: TraderStats = {
  pnl30d: 20610,
  winRate30d: 0.92,
  roiPercent30d: 1.5,
  tradeCount30d: 48,
};

describe('StatsRow', () => {
  it('renders the stats row container', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
    ).toBeOnTheScreen();
  });

  it('renders win rate as percentage when winRate30d is non-null and positive', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);
    expect(screen.getByText('92%')).toBeOnTheScreen();
  });

  it('renders win rate as dash when winRate30d is null', () => {
    const stats = { ...baseStats, winRate30d: null } as unknown as TraderStats;
    renderWithProvider(<StatsRow stats={stats} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders win rate as 0% when winRate30d is 0', () => {
    const stats = { ...baseStats, winRate30d: 0 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });

  it('renders formatted PnL when pnl30d is non-null and positive', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);
    expect(screen.getByText('+$21K')).toBeOnTheScreen();
  });

  it('renders dash when pnl30d is null', () => {
    const stats = { ...baseStats, pnl30d: null } as unknown as TraderStats;
    renderWithProvider(<StatsRow stats={stats} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders negative PnL correctly', () => {
    const stats = { ...baseStats, pnl30d: -5000 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('-$5K')).toBeOnTheScreen();
  });

  it('renders PnL for small values without K suffix', () => {
    const stats = { ...baseStats, pnl30d: 500 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('+$500')).toBeOnTheScreen();
  });

  it('renders both null winRate and null pnl as dashes', () => {
    const stats = {
      ...baseStats,
      winRate30d: null,
      pnl30d: null,
    } as unknown as TraderStats;

    renderWithProvider(<StatsRow stats={stats} />);

    const dashes = screen.getAllByText('\u2014');

    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  describe('avg. hold time', () => {
    it('renders a dash when avgHoldMinutes is null', () => {
      renderWithProvider(<StatsRow stats={baseStats} avgHoldMinutes={null} />);

      expect(screen.getByText('\u2014')).toBeOnTheScreen();
    });

    it('renders minutes when avgHoldMinutes is less than 60', () => {
      renderWithProvider(<StatsRow stats={baseStats} avgHoldMinutes={45} />);

      expect(screen.getByText('45m')).toBeOnTheScreen();
    });

    it('renders hours when avgHoldMinutes is 60 or more but less than 1440', () => {
      renderWithProvider(<StatsRow stats={baseStats} avgHoldMinutes={90} />);

      expect(screen.getByText('1.5 hrs')).toBeOnTheScreen();
    });

    it('renders days when avgHoldMinutes is 1440 or more', () => {
      renderWithProvider(<StatsRow stats={baseStats} avgHoldMinutes={2880} />);

      expect(screen.getByText('2 days')).toBeOnTheScreen();
    });
  });

  it('renders win rate label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('win rate')).toBeOnTheScreen();
  });

  it('renders 30D P&L label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('30D P&L')).toBeOnTheScreen();
  });

  it('renders avg hold label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('avg. hold')).toBeOnTheScreen();
  });
});
