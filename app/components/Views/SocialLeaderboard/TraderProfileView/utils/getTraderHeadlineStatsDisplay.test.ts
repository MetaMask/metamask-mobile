import type { TraderStats } from '@metamask/social-controllers';
import { getTraderHeadlineStatsDisplay } from './getTraderHeadlineStatsDisplay';

const baseStats: TraderStats = {
  pnl7d: 20610,
  winRate7d: 0.92,
  roiPercent7d: 1.5,
  tradeCount30d: 48,
};

describe('getTraderHeadlineStatsDisplay', () => {
  it('formats win rate and positive PnL', () => {
    const result = getTraderHeadlineStatsDisplay(baseStats);

    expect(result.winRate).toBe('92%');
    expect(result.isWinRatePositive).toBe(true);
    expect(result.pnl).toBe('+$20,610');
    expect(result.hasPnl).toBe(true);
    expect(result.isPnlPositive).toBe(true);
  });

  it('handles null win rate and null pnl', () => {
    const stats = {
      ...baseStats,
      winRate7d: null,
      pnl7d: null,
    } as unknown as TraderStats;

    const result = getTraderHeadlineStatsDisplay(stats);

    expect(result.winRate).toBe('\u2014');
    expect(result.isWinRatePositive).toBe(false);
    expect(result.pnl).toBe('\u2014');
    expect(result.hasPnl).toBe(false);
    expect(result.isPnlPositive).toBe(false);
  });

  it('handles negative PnL', () => {
    const result = getTraderHeadlineStatsDisplay({
      ...baseStats,
      pnl7d: -5000,
    });

    expect(result.pnl).toBe('-$5,000');
    expect(result.isPnlPositive).toBe(false);
  });
});
