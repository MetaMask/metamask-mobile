import type { TraderStats } from '@metamask/social-controllers';
import { getTraderHeadlineStatsDisplay } from './getTraderHeadlineStatsDisplay';

const baseStats: TraderStats = {
  pnl30d: 20610,
  winRate30d: 0.92,
  roiPercent30d: 1.5,
  tradeCount30d: 48,
};

describe('getTraderHeadlineStatsDisplay', () => {
  it('formats win rate and positive PnL from 30d stats', () => {
    const result = getTraderHeadlineStatsDisplay(baseStats);

    expect(result.winRate).toBe('92%');
    expect(result.isWinRatePositive).toBe(true);
    expect(result.pnl).toBe('+$20,610');
    expect(result.hasPnl).toBe(true);
    expect(result.isPnlPositive).toBe(true);
  });

  it('renders dashes when 30d win rate and pnl are null', () => {
    const stats = {
      ...baseStats,
      winRate30d: null,
      pnl30d: null,
    } as unknown as TraderStats;

    const result = getTraderHeadlineStatsDisplay(stats);

    expect(result.winRate).toBe('\u2014');
    expect(result.isWinRatePositive).toBe(false);
    expect(result.pnl).toBe('\u2014');
    expect(result.hasPnl).toBe(false);
    expect(result.isPnlPositive).toBe(false);
  });

  it('formats negative 30d PnL', () => {
    const result = getTraderHeadlineStatsDisplay({
      ...baseStats,
      pnl30d: -5000,
    });

    expect(result.pnl).toBe('-$5,000');
    expect(result.isPnlPositive).toBe(false);
  });
});
