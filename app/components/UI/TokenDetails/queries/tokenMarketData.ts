import { queryOptions } from '@tanstack/react-query';
import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';
import type { FungibleAssetPrice } from '@metamask/assets-controller';

const SPOT_PRICES_URL = 'https://price.api.cx.metamask.io/v3/spot-prices';

/**
 * Market cap, volume and supply move slowly enough to reread on the scale of
 * minutes. The headline price does not come from here — it is live-updated
 * elsewhere — so nothing on screen is stale for as long as this allows.
 *
 * The same as the app-wide default, stated rather than inherited so that the
 * freshness of these figures is a decision on the record.
 */
export const TOKEN_MARKET_DATA_STALE_TIME_MS = 5 * 60 * 1000;

export const tokenMarketDataKeys = {
  all: () => ['tokenDetails', 'marketData'] as const,
  /**
   * Keyed by currency as well as asset, because the response is denominated in
   * whatever `vsCurrency` asked for — the same asset genuinely has a different
   * payload per currency.
   *
   * Lower-cased to match the request, so `USD` and `usd` share one entry
   * rather than fetching the same figures twice.
   */
  byAsset: (assetId: CaipAssetType | null, currency: string | undefined) =>
    [...tokenMarketDataKeys.all(), assetId, currency?.toLowerCase()] as const,
};

/**
 * A token's market data from the price API, in the user's selected currency.
 *
 * Exported as options rather than as a hook so a list screen can prefetch an
 * asset on press — the detail screen then reads it from the cache instead of
 * opening on a spinner, which is the common path in from Explore, Trending and
 * Search.
 *
 * Retries are left to the app-wide `retry: 2` in `ReactQueryService`, which
 * exists for dropped mobile connections and is the right policy for a plain
 * GET like this one.
 *
 * @param assetId - CAIP-19 asset ID. Callers that may hold `null` gate the
 * query with `enabled`; the `queryFn` only tolerates it so that the key stays
 * computable on a render where the asset is not yet known.
 * @param currency - The user's selected currency code. Typed as optional
 * because the key is built on every render, including ones before the currency
 * controller has hydrated — a request without a `vsCurrency` would come back in
 * the wrong denomination, so there is nothing useful to ask for yet.
 */
export const tokenMarketDataOptions = (
  assetId: CaipAssetType | null,
  currency: string | undefined,
) =>
  queryOptions({
    queryKey: tokenMarketDataKeys.byAsset(assetId, currency),
    queryFn: async (): Promise<FungibleAssetPrice | null> => {
      if (!assetId || !currency) {
        return null;
      }

      const url = `${SPOT_PRICES_URL}?${new URLSearchParams({
        assetIds: assetId,
        includeMarketData: 'true',
        vsCurrency: currency.toLowerCase(),
      })}`;

      const response = (await handleFetch(url)) as Record<
        string,
        FungibleAssetPrice | undefined
      >;

      return response?.[assetId] ?? null;
    },
    staleTime: TOKEN_MARKET_DATA_STALE_TIME_MS,
  });
