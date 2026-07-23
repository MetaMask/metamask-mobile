import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';

export const TOKEN_API_BASE_URL = 'https://token.api.cx.metamask.io';

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

interface RawMarketData {
  price?: string | number;
  pricePercentChange1d?: string | number;
  pricePercentChange1h?: string | number;
  pricePercentChange7d?: string | number;
  marketCap?: number;
  totalVolume?: number;
  volume24h?: number;
}

interface RawTokenAsset {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  marketData?: RawMarketData;
}

/**
 * Normalises a single raw token asset from the Token API response into the
 * shape the rest of the watchlist code expects. Handles differences such as
 * `price` arriving as a string and `pricePercentChange1d` instead of `24h`.
 */
const normaliseTokenAsset = (raw: RawTokenAsset): WatchlistTokenMetadata => {
  const md = raw.marketData;
  return {
    assetId: raw.assetId,
    symbol: raw.symbol,
    name: raw.name,
    decimals: raw.decimals,
    iconUrl: raw.iconUrl,
    marketData: md
      ? {
          price: md.price != null ? Number(md.price) : undefined,
          pricePercentChange24h:
            md.pricePercentChange1d != null
              ? Number(md.pricePercentChange1d)
              : undefined,
          pricePercentChange1h:
            md.pricePercentChange1h != null
              ? Number(md.pricePercentChange1h)
              : undefined,
          pricePercentChange7d:
            md.pricePercentChange7d != null
              ? Number(md.pricePercentChange7d)
              : undefined,
          marketCap: md.marketCap,
          totalVolume: md.totalVolume,
          volume24h: md.volume24h,
        }
      : undefined,
  };
};

const buildAssetsUrl = (assetIds: readonly string[]): string => {
  const params = new URLSearchParams({
    assetIds: assetIds.join(','),
    includeMarketData: 'true',
    includeRwaData: 'true',
  });
  return `${TOKEN_API_BASE_URL}/assets?${params.toString()}`;
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

  const normalised = responses.flatMap((response) =>
    Array.isArray(response)
      ? (response as RawTokenAsset[]).map(normaliseTokenAsset)
      : [],
  );

  // Re-sort to match the caller's requested order — the Token API does
  // not guarantee it returns assets in the same order they were requested.
  const orderIndex = new Map(assetIds.map((id, i) => [id.toLowerCase(), i]));
  normalised.sort((a, b) => {
    const ai = orderIndex.get(String(a.assetId).toLowerCase()) ?? Infinity;
    const bi = orderIndex.get(String(b.assetId).toLowerCase()) ?? Infinity;
    return ai - bi;
  });

  return normalised;
};
