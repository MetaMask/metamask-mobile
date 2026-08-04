import type { SliceDelta } from '../types';

const PREV_TOTAL_EPS = 1e-9;

/**
 * Combined hero line for Total Balance: tokens (assets controller 24h) + perps.
 * Perps uses account value − 24h snapshot only when the Redux baseline is
 * trustworthy. Predict / DeFi / Money are included in total value but treated
 * as flat because they do not expose comparable 24h history.
 */
export function computeAggregateHero24hDelta(params: {
  totalFiat: number;
  tokensDelta?: SliceDelta;
  /** Display-currency Perps NAV change over 24h. */
  perpsFiatContribution: number;
  /** True when the user has an active perps account included in the breakdown. */
  includePerpsContribution: boolean;
}): SliceDelta | undefined {
  const tokenAmount = params.tokensDelta?.amount ?? 0;
  const perpsAmount =
    params.includePerpsContribution &&
    Number.isFinite(params.perpsFiatContribution)
      ? params.perpsFiatContribution
      : 0;

  const amount = tokenAmount + perpsAmount;

  const tokenSignal = params.tokensDelta !== undefined;
  const perpsSignal = params.includePerpsContribution;

  if (!tokenSignal && !perpsSignal) {
    return undefined;
  }

  const prevTotal = params.totalFiat - amount;
  let percent: number | undefined;
  if (prevTotal > PREV_TOTAL_EPS) {
    percent = amount / prevTotal;
  }

  return {
    amount,
    percent,
  };
}
