import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StatsRow from './StatsRow';
import type { TraderStats } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';

const baseStats: TraderStats = {
  pnl7d: 20610,
  winRate7d: 0.92,
  roiPercent7d: 1.5,
  tradeCount30d: 48,
};

describe('StatsRow', () => {
  it('renders the stats row container', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
    ).toBeOnTheScreen();
  });

  it('renders win rate as percentage when winRate7d is non-null and positive', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);
    expect(screen.getByText('92%')).toBeOnTheScreen();
  });

  it('renders win rate as dash when winRate7d is null', () => {
    const stats = { ...baseStats, winRate7d: null } as unknown as TraderStats;
    renderWithProvider(<StatsRow stats={stats} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders win rate as 0% when winRate7d is 0', () => {
    const stats = { ...baseStats, winRate7d: 0 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });

  it('renders the full positive PnL with no decimals (no abbreviation)', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);
    expect(screen.getByText('+$20,610')).toBeOnTheScreen();
  });

  it('renders large positive PnL in full with no decimals', () => {
    const stats = { ...baseStats, pnl7d: 1_170_000 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('+$1,170,000')).toBeOnTheScreen();
  });

  it('renders dash when pnl7d is null', () => {
    const stats = { ...baseStats, pnl7d: null } as unknown as TraderStats;
    renderWithProvider(<StatsRow stats={stats} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders negative PnL in full with a leading minus', () => {
    const stats = { ...baseStats, pnl7d: -5000 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('-$5,000')).toBeOnTheScreen();
  });

  it('renders sub-$1K PnL without decimals', () => {
    const stats = { ...baseStats, pnl7d: 500 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('+$500')).toBeOnTheScreen();
  });

  it('rounds fractional PnL to a whole dollar', () => {
    const stats = { ...baseStats, pnl7d: 500.236 };
    renderWithProvider(<StatsRow stats={stats} />);
    expect(screen.getByText('+$500')).toBeOnTheScreen();
  });

  it('renders both null winRate and null pnl as dashes', () => {
    const stats = {
      ...baseStats,
      winRate7d: null,
      pnl7d: null,
    } as unknown as TraderStats;

    renderWithProvider(<StatsRow stats={stats} />);

    const dashes = screen.getAllByText('\u2014');

    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  describe('avg. hold time', () => {
    it('renders a dash when holdTimeMinutes is null', () => {
      renderWithProvider(<StatsRow stats={baseStats} holdTimeMinutes={null} />);

      expect(screen.getByText('\u2014')).toBeOnTheScreen();
    });

    it('renders minutes when holdTimeMinutes is less than 60', () => {
      renderWithProvider(<StatsRow stats={baseStats} holdTimeMinutes={45} />);

      expect(screen.getByText('45m')).toBeOnTheScreen();
    });

    it('renders hours when holdTimeMinutes is 60 or more but less than 1440', () => {
      renderWithProvider(<StatsRow stats={baseStats} holdTimeMinutes={90} />);

      expect(screen.getByText('1.5 hrs')).toBeOnTheScreen();
    });

    it('renders days when holdTimeMinutes is 1440 or more', () => {
      renderWithProvider(<StatsRow stats={baseStats} holdTimeMinutes={2880} />);

      expect(screen.getByText('2 days')).toBeOnTheScreen();
    });
  });

  it('renders the win rate label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('Win rate')).toBeOnTheScreen();
  });

  it('renders the 7D P&L label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('7D P&L')).toBeOnTheScreen();
  });

  it('renders the avg. hold label', () => {
    renderWithProvider(<StatsRow stats={baseStats} />);

    expect(screen.getByText('Avg. hold')).toBeOnTheScreen();
  });
});
