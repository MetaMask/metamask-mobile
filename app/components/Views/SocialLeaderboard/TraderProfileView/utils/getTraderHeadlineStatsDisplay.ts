import type { TraderStats } from '@metamask/social-controllers';
import {
  EM_DASH,
  formatPercent,
  formatSignedFullUsdNoDecimals,
} from '../../utils/formatters';

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
  // `winRate7d` is a 0..1 fraction; the leaderboard's win-rate column is
  // already whole-percent. Scale here so both surfaces render through the same
  // formatter (unsigned, no decimals) rather than hand-rolling one of them.
  const winRate =
    stats.winRate7d != null
      ? formatPercent(stats.winRate7d * 100, {
          showSign: false,
          decimals: 0,
          fallback: EM_DASH,
        })
      : EM_DASH;
  const isWinRatePositive = (stats.winRate7d ?? 0) > 0;
  const hasPnl = stats.pnl7d != null;
  const pnl = formatSignedFullUsdNoDecimals(stats.pnl7d);
  const isPnlPositive = stats.pnl7d != null && stats.pnl7d >= 0;

  return { winRate, isWinRatePositive, pnl, hasPnl, isPnlPositive };
}
