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
  // `winRate30d` is a 0..1 fraction; the leaderboard's win-rate column is
  // already whole-percent. Scale here so both surfaces render through the same
  // formatter (unsigned, no decimals) rather than hand-rolling one of them.
  const winRate =
    stats.winRate30d != null
      ? formatPercent(stats.winRate30d * 100, {
          showSign: false,
          decimals: 0,
          fallback: EM_DASH,
        })
      : EM_DASH;
  const isWinRatePositive = (stats.winRate30d ?? 0) > 0;
  const hasPnl = stats.pnl30d != null;
  const pnl = formatSignedFullUsdNoDecimals(stats.pnl30d);
  const isPnlPositive = stats.pnl30d != null && stats.pnl30d >= 0;

  return { winRate, isWinRatePositive, pnl, hasPnl, isPnlPositive };
}
