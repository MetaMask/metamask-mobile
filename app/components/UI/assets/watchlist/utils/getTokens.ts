import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';

/**
 * Token API base URL used to look up asset metadata in bulk.
 *
 * The watchlist stores CAIP-19 IDs only; the UI needs symbol/name/icon and
 * (when available) market data to render. The same host is used by
 * {@link ../../../Bridge/hooks/useAssetMetadata} for single-asset lookups so
 * we keep watchlist consistent with the rest of the app.
 *
 * OpenAPI spec: https://token.dev-api.cx.metamask.io/docs-json (`/assets`).
 */
export const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

/**
 * Subset of market data fields exposed by the Token API `/assets` endpoint
 * when `includeMarketData=true`. Only the fields the watchlist UI cares
 * about are typed here; any extra fields the API returns are preserved as
 * `unknown` via index access if needed.
 */
export interface WatchlistTokenMarketData {
  price?: number;
  pricePercentChange1h?: number;
  pricePercentChange24h?: number;
  pricePercentChange7d?: number;
  marketCap?: number;
  totalVolume?: number;
  volume24h?: number;
}

/**
 * Token metadata shape consumed by the watchlist UI. Mirrors the response
 * fields documented by the `/assets` endpoint of the Token API (the same
 * endpoint that powers the trending UI), plus the assetId echoed back so
 * callers can correlate the response to their original request.
 */
export interface WatchlistTokenMetadata {
  assetId: CaipAssetType | string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  marketData?: WatchlistTokenMarketData;
}

/**
 * Build the query string used for the `/assets` endpoint.
 *
 * The watchlist UI mirrors the trending tokens UI, so we ask the API for
 * the same hydration data (icon URL, market data, RWA, and security data).
 */
const buildAssetsUrl = (assetIds: string[]): string => {
  const params = new URLSearchParams({
    assetIds: assetIds.join(','),
    includeIconUrl: 'true',
    includeMarketData: 'true',
    includeRwaData: 'true',
    includeTokenSecurityData: 'true',
  });
  return `${TOKEN_API_V3_BASE_URL}/assets?${params.toString()}`;
};

/**
 * Fetch token metadata for a batch of CAIP-19 asset IDs.
 *
 * The watchlist storage layer persists raw CAIP-19 IDs only — those are not
 * useable by the UI directly. This function hydrates that list into a
 * structured array of token metadata that mirrors the data the trending UI
 * already renders.
 *
 * Returns an empty array (without calling the network) when no IDs are
 * provided so callers can safely pass an empty watchlist.
 */
export const getTokens = async (
  assetIds: readonly string[],
): Promise<WatchlistTokenMetadata[]> => {
  if (!assetIds.length) {
    return [];
  }

  const result = await handleFetch(buildAssetsUrl([...assetIds]));

  if (!Array.isArray(result)) {
    return [];
  }

  return result as WatchlistTokenMetadata[];
};
