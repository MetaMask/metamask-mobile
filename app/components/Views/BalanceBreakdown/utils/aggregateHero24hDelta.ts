import type { SliceDelta } from '../types';

const PREV_TOTAL_EPS = 1e-9;

/**
 * Combined hero line for Total Balance: tokens (assets controller 24h) + perps.
 * Perps uses account value − 24h snapshot when Redux baseline is trustworthy; otherwise live
 * unrealized PnL (matches Perps home “profit”) so we don’t drop perps when `accountValue1dAgo`
 * is still zero.
 * Predict / DeFi are in `totalFiat` but treated as flat for this delta.
 */
export function computeAggregateHero24hDelta(params: {
  totalFiat: number;
  tokensDelta?: SliceDelta;
  /**
   * Display-currency perps leg: either NAV 24h change or session unrealized PnL (caller chooses).
   */
  perpsFiatContribution: number;
  /** True when the user has an active perps account included in the breakdown. */
  includePerpsContribution: boolean;
  /**
   * Hero suffix label. Omit field for default `24h`. Pass `null` to show no label (mixed windows).
   */
  deltaLabel?: SliceDelta['label'] | null;
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

  const label: SliceDelta['label'] | undefined =
    params.deltaLabel === null
      ? undefined
      : (params.deltaLabel ?? '24h');

  return {
    amount,
    percent,
    label,
  };
}
