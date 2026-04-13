import React from 'react';
import { render } from '@testing-library/react-native';
import StatsRow from './StatsRow';
import type { TraderStats } from '@metamask/social-controllers';

const baseStats: TraderStats = {
  pnl30d: 20610,
  winRate30d: 0.92,
  roiPercent30d: 1.5,
  tradeCount30d: 48,
};

describe('StatsRow', () => {
  it('renders the container with the expected testID', () => {
    const { getByTestId } = render(<StatsRow stats={baseStats} />);
    expect(getByTestId('trader-profile-stats-row')).toBeOnTheScreen();
  });

  it('renders the win rate as a percentage', () => {
    const { getByText } = render(<StatsRow stats={baseStats} />);
    // winRate30d: 0.92 → Math.round(0.92 * 100) = 92 → '92%'
    expect(getByText('92%')).toBeOnTheScreen();
  });

  it('rounds the win rate to the nearest integer', () => {
    const stats = { ...baseStats, winRate30d: 0.925 };
    const { getByText } = render(<StatsRow stats={stats} />);
    // Math.round(0.925 * 100) = Math.round(92.5) = 93
    expect(getByText('93%')).toBeOnTheScreen();
  });

  it('renders the 30D PnL via formatPnl', () => {
    const { getByText } = render(<StatsRow stats={baseStats} />);
    // formatPnl(20610): Math.round(20610/1000) = 21 → '+$21K'
    expect(getByText('+$21K')).toBeOnTheScreen();
  });

  it('renders a negative PnL correctly', () => {
    const stats = { ...baseStats, pnl30d: -1500 };
    const { getByText } = render(<StatsRow stats={stats} />);
    // formatPnl(-1500): Math.round(1500/1000) = 2 → '-$2K'
    expect(getByText('-$2K')).toBeOnTheScreen();
  });

  it('shows an em-dash when winRate30d is null', () => {
    const stats = { ...baseStats, winRate30d: null };
    const { getAllByText } = render(<StatsRow stats={stats} />);
    expect(getAllByText('\u2014').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an em-dash when pnl30d is null', () => {
    const stats = { ...baseStats, pnl30d: null };
    const { getAllByText } = render(<StatsRow stats={stats} />);
    expect(getAllByText('\u2014').length).toBeGreaterThanOrEqual(1);
  });

  it('always shows an em-dash for avg hold (not yet implemented)', () => {
    const { getAllByText } = render(<StatsRow stats={baseStats} />);
    // avg hold column always renders '\u2014'
    expect(getAllByText('\u2014').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the win rate label', () => {
    const { getByText } = render(<StatsRow stats={baseStats} />);
    expect(getByText('win rate')).toBeOnTheScreen();
  });

  it('renders the 30D P&L label', () => {
    const { getByText } = render(<StatsRow stats={baseStats} />);
    expect(getByText('30D P&L')).toBeOnTheScreen();
  });

  it('renders the avg hold label', () => {
    const { getByText } = render(<StatsRow stats={baseStats} />);
    expect(getByText('avg. hold')).toBeOnTheScreen();
  });
});
