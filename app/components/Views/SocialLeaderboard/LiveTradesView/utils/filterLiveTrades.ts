import { MARKET_CAP_RANGE } from '../../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../../shell/filters/types';
import { resolveTraderCohort } from '../../../../UI/SocialFeed/utils/traderStats';
import type { LiveTradeRowModel } from '../types';

/** Slider bounds are USD billions; feed market cap is USD. */
const BILLIONS = 1_000_000_000;

const isDefaultMarketCap = (filters: SocialShellFilters): boolean =>
  filters.marketCap.min === MARKET_CAP_RANGE.min &&
  filters.marketCap.max === MARKET_CAP_RANGE.max;

const matchesAsset = (
  row: LiveTradeRowModel,
  filters: SocialShellFilters,
): boolean => {
  if (filters.type === 'tokens') {
    return row.type === 'spot';
  }
  if (filters.type === 'perps') {
    return row.type === 'perps';
  }
  return true;
};

const matchesTraderCohort = (
  row: LiveTradeRowModel,
  filters: SocialShellFilters,
  followingProfileIds: readonly string[],
): boolean => {
  const { traderCohort } = filters;
  if (traderCohort === 'all') {
    return true;
  }
  if (traderCohort === 'following') {
    return followingProfileIds.includes(row.traderId);
  }
  // `verified` is a Leaderboard-only chip; Live trades uses the Verification
  // section instead, which has no payload field to filter on.
  if (traderCohort === 'verified') {
    return true;
  }
  return resolveTraderCohort(row.author.pnl30d) === traderCohort;
};

const matchesMarketCap = (
  row: LiveTradeRowModel,
  filters: SocialShellFilters,
): boolean => {
  if (isDefaultMarketCap(filters)) {
    return true;
  }
  // Perps (and spot fills that omitted marketCap) have nothing to test, so
  // they pass rather than disappearing when the slider moves.
  if (row.marketCapUsd == null) {
    return true;
  }
  const billions = row.marketCapUsd / BILLIONS;
  return billions >= filters.marketCap.min && billions <= filters.marketCap.max;
};

/**
 * Client-side Live trades filter. Data-backed:
 * - Asset Tokens / Perps (`row.type`)
 * - Traders Following (followed profile ids)
 * - Traders Shrimp / Dolphin / Whale (`resolveTraderCohort(actor.pnl30d)`)
 * - Market cap on spot fills that carry `Trade.marketCap` (USD billions)
 *
 * Inert (chips stay visible; no payload to honor):
 * - Verification — no verified field anywhere; the blue check is invented.
 * - 24h volume — neither the feed payload nor social-api carries token 24h volume.
 */
export function filterLiveTrades(
  rows: readonly LiveTradeRowModel[],
  filters: SocialShellFilters,
  followingProfileIds: readonly string[] = [],
): LiveTradeRowModel[] {
  return rows.filter(
    (row) =>
      matchesAsset(row, filters) &&
      matchesTraderCohort(row, filters, followingProfileIds) &&
      matchesMarketCap(row, filters),
  );
}
