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

/** Returns `[]` (without hitting the network) when `assetIds` is empty. */
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
