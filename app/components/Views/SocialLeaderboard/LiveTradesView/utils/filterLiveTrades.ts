import type { SocialShellFilters } from '../../shell/filters/types';
import {
  matchesShellAssetType,
  matchesShellMarketCap,
  matchesShellTraderCohort,
} from '../../shell/filters/matchShellFilters';
import type { LiveTradeRowModel } from '../types';

/**
 * Client-side Live trades filter. Data-backed:
 * - Asset Tokens / Perps (`row.type`)
 * - Traders Following (followed profile ids)
 * - Traders Shrimp / Dolphin / Whale (`resolveTraderCohort(actor.pnl30d)`)
 * - Market cap on spot fills that carry `Trade.marketCap` (USD billions)
 *
 * Hidden in the sheet until the API can honor them:
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
      matchesShellAssetType(row.type, filters) &&
      matchesShellTraderCohort({
        traderCohort: filters.traderCohort,
        pnl30d: row.author.pnl30d,
        isFollowing: followingProfileIds.includes(row.traderId),
      }) &&
      matchesShellMarketCap(row.marketCapUsd, filters),
  );
}
