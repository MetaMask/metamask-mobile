// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TraderRowMetric } from '../../Homepage/Sections/TopTraders/components/TraderRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import type { LeaderboardSort } from '../components/Filters';
import { formatPercent, formatSignedUsd } from '../utils/formatters';

/** The trader's value for the active ranking metric, in the loaded window. */
const getMetricValue = (
  trader: TopTrader,
  sort: LeaderboardSort,
): number | null => {
  if (sort === 'roi') {
    return trader.percentageChange;
  }
  if (sort === 'winRate') {
    return trader.winRatePercent;
  }
  return trader.pnlValue;
};

/**
 * Orders the loaded traders by the active metric, highest first, and renumbers
 * `rank` to the displayed position so the podium medals stay on the top three
 * rows. `overallRank` keeps the server's ranking for podium decoration further
 * downstream.
 *
 * The API's `sort` query has no timeframe parameter — it always ranks on the
 * 30-day figures — so ordering a 7-day metric has to happen here, over the page
 * the server returned. That page is still chosen server-side, so a 7-day view
 * ranks the right traders in the wrong-window's shortlist; only the ordering
 * within it is corrected.
 *
 * Traders missing the metric sort last rather than as zero, so an absent win
 * rate doesn't read as a 0% one.
 */
export const rankTradersByMetric = (
  traders: TopTrader[],
  sort: LeaderboardSort,
): TopTrader[] =>
  traders
    .map((trader) => ({ trader, value: getMetricValue(trader, sort) }))
    .sort((a, b) => {
      if (a.value === b.value) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return b.value - a.value;
    })
    .map(({ trader }, index) => ({ ...trader, rank: index + 1 }));

/**
 * Resolves the figure a leaderboard row shows for the active ranking metric, so
 * the list always displays the value it is ordered by.
 */
export const getTraderMetricDisplay = (
  trader: TopTrader,
  sort: LeaderboardSort,
): TraderRowMetric => {
  if (sort === 'roi') {
    return {
      label: formatPercent(trader.percentageChange),
      isPositive: trader.percentageChange >= 0,
    };
  }

  if (sort === 'winRate') {
    // A win rate is a share, not a gain, so it carries no +/- sign. Colouring
    // any non-zero rate green matches the trader profile's headline stat.
    return {
      label: formatPercent(trader.winRatePercent, {
        showSign: false,
        decimals: 0,
      }),
      isPositive: (trader.winRatePercent ?? 0) > 0,
    };
  }

  return {
    label: formatSignedUsd(trader.pnlValue),
    isPositive: trader.pnlValue >= 0,
  };
};
