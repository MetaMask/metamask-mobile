import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';

/** OpenAPI spec: https://token.dev-api.cx.metamask.io/docs-json (`/assets`). */
export const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

export interface WatchlistTokenMarketData {
  price?: number;
  pricePercentChange1h?: number;
  pricePercentChange24h?: number;
  pricePercentChange7d?: number;
  marketCap?: number;
  totalVolume?: number;
  volume24h?: number;
}

export interface WatchlistTokenMetadata {
  assetId: CaipAssetType | string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  marketData?: WatchlistTokenMarketData;
}

const buildAssetsUrl = (assetIds: readonly string[]): string => {
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
 * Max IDs per `/assets` request. The Token API does not document a cap; this
 * is a URL-length budget — at 80 chars per CAIP-19 ID (URL-encoded commas)
 * 50 IDs stays under ~4 KB, well below the ~8 KB reverse-proxy default.
 */
export const GET_TOKENS_BATCH_SIZE = 50;

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (items.length <= size) {
    return [items.slice()];
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

/** Returns `[]` (without hitting the network) when `assetIds` is empty. */
export const getTokens = async (
  assetIds: readonly string[],
): Promise<WatchlistTokenMetadata[]> => {
  if (!assetIds.length) {
    return [];
  }

  const batches = chunk(assetIds, GET_TOKENS_BATCH_SIZE);
  const responses = await Promise.all(
    batches.map((batch) => handleFetch(buildAssetsUrl(batch))),
  );

  return responses.flatMap((response) =>
    Array.isArray(response) ? (response as WatchlistTokenMetadata[]) : [],
  );
};
