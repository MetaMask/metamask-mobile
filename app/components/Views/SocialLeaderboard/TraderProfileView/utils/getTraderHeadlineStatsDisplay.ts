import type { TraderStats } from '@metamask/social-controllers';
import { formatSignedFullUsdNoDecimals } from '../../utils/formatters';

export interface TraderHeadlineStatsDisplay {
  winRate: string;
  isWinRatePositive: boolean;
  pnl: string;
  hasPnl: boolean;
  isPnlPositive: boolean;
}

export function getTraderHeadlineStatsDisplay(
  stats: TraderStats,
): TraderHeadlineStatsDisplay {
  const winRate =
    stats.winRate7d != null
      ? `${Math.round(stats.winRate7d * 100)}%`
      : '\u2014';
  const isWinRatePositive = (stats.winRate7d ?? 0) > 0;
  const hasPnl = stats.pnl7d != null;
  const pnl = formatSignedFullUsdNoDecimals(stats.pnl7d);
  const isPnlPositive = stats.pnl7d != null && stats.pnl7d >= 0;

  return { winRate, isWinRatePositive, pnl, hasPnl, isPnlPositive };
}
