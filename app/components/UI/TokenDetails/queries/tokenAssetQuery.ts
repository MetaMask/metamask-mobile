import { queryOptions, useQuery } from '@tanstack/react-query';
import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';

export const TOKEN_ASSETS_V2_PATH = '/v2/assets';

const QUERY_STALE_TIME_MS = 30_000;

export interface TokenAssetMarketData {
  marketCap: number | null;
  totalVolume: number | null;
  price: string | null;
  pricePercentChange1d: string | null;
  pricePercentChange1h: string | null;
  pricePercentChange5m?: string | null;
  pricePercentChange4h?: string | null;
  liquidity: number | null;
  dilutedMarketCap: number | null;
  circulatingSupply: number | null;
}

export interface TokenAssetBondingCurve {
  pool: string | null;
  migratedPool: string | null;
  migratedAt: number | null;
  completedAt: number | null;
}

export interface TokenAssetLaunchpadData {
  protocol: string | null;
  deployer: string | null;
  launchedAt: number | null;
  description: string | null;
  bondingCurve: TokenAssetBondingCurve | null;
  graduationPercent: number | null;
  graduationStage: string | null;
  devHeldPercent: number | null;
  insiderHeldPercent: number | null;
  sniperHeldPercent: number | null;
  holdersCount: number | null;
  top10HeldPercent: string | null;
}

export interface TokenAssetHolders {
  count: number | null;
}

export interface TokenAssetRecord {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  rwaData: unknown;
  marketData: TokenAssetMarketData | null;
  launchpad: string | null;
  launchpadData: TokenAssetLaunchpadData | null;
  holders: TokenAssetHolders | null;
}

export const resolveTokenAssetDetails = (
  _assetId: string | null,
  record: TokenAssetRecord | null | undefined,
  isError: boolean,
): TokenAssetRecord | null => (isError ? null : (record ?? null));

const isTokenAssetRecord = (value: unknown): value is TokenAssetRecord =>
  typeof value === 'object' &&
  value != null &&
  'assetId' in value &&
  typeof (value as { assetId: unknown }).assetId === 'string';

const readHolders = (value: unknown): TokenAssetHolders | null => {
  if (typeof value !== 'object' || value == null || !('holders' in value)) {
    return null;
  }
  const holders = (value as { holders: unknown }).holders;
  if (typeof holders !== 'object' || holders == null || !('count' in holders)) {
    return null;
  }
  const count = (holders as { count: unknown }).count;
  return typeof count === 'number' && Number.isFinite(count) ? { count } : null;
};

export const fetchTokenAsset = async (
  assetId: string,
  signal?: AbortSignal,
  baseUrl: string = TOKEN_API_BASE_URL,
): Promise<TokenAssetRecord | null> => {
  const params = new URLSearchParams({
    assetIds: assetId,
    includeLabels: 'true',
    includeLaunchpadData: 'true',
    includeTopHolders: 'true',
    includeRwaData: 'true',
    includeMarketData: 'true',
  });
  const response = await fetch(
    `${baseUrl}${TOKEN_ASSETS_V2_PATH}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Token assets API error: ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    return null;
  }
  const match = body.find(
    (item) =>
      isTokenAssetRecord(item) &&
      item.assetId.toLowerCase() === assetId.toLowerCase(),
  );
  if (!match) {
    return null;
  }
  return {
    ...match,
    holders: readHolders(match),
  };
};

export const tokenAssetQueryOptions = (
  assetId: string,
  baseUrl: string = TOKEN_API_BASE_URL,
) =>
  queryOptions({
    queryKey: ['token-details', 'v2-assets', assetId, baseUrl] as const,
    queryFn: ({ signal }) => fetchTokenAsset(assetId, signal, baseUrl),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });

export interface UseTokenAssetDetailsResult {
  asset: TokenAssetRecord | null;
  isLoading: boolean;
  isError: boolean;
}

export const useTokenAssetDetails = (
  assetId: string | null,
  baseUrl?: string,
): UseTokenAssetDetailsResult => {
  const query = useQuery({
    ...tokenAssetQueryOptions(assetId ?? '', baseUrl),
    enabled: Boolean(assetId),
  });

  return {
    asset: resolveTokenAssetDetails(assetId, query.data, query.isError),
    isLoading: Boolean(assetId) && query.isPending,
    isError: query.isError,
  };
};
