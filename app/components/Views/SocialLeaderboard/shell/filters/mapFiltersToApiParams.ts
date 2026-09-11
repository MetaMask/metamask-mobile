import { NETWORK_TO_CHAIN_ID, TYPE_CHAINS } from './filterDefaults';
import type { SocialFilterApiParams, SocialShellFilters } from './types';

/**
 * Maps a tab's `applied` filters to API-ready params. The shape mirrors what
 * the existing `useTopTraders` / `useTraderFeed` hooks expect so the V1 lists
 * can drop it in once they ship. No fetch wiring happens here — this is a
 * pure function so it can be unit-tested in isolation.
 *
 * `chains` reuses the V0 chain sets (see `TYPE_CHAINS`). When `network` is
 * `all`, the full chain set is forwarded; otherwise the single selected
 * chain overrides it so the endpoint receives a one-element array.
 */
export function mapFiltersToApiParams(
  filters: SocialShellFilters,
): SocialFilterApiParams {
  const chains =
    filters.network === 'all'
      ? TYPE_CHAINS[filters.type]
      : [NETWORK_TO_CHAIN_ID[filters.network]];

  return {
    chains,
    timeframe: filters.timeframe,
    network: filters.network,
    traderCohort: filters.traderCohort,
    marketCap: filters.marketCap,
    volume24h: filters.volume24h,
  };
}
