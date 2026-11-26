import {
  array,
  create,
  nullable,
  number,
  optional,
  string,
  type,
} from '@metamask/superstruct';
import { useNetworkQuery } from '../../../../core/Networking/useNetworkQuery';
import { NetworkCache } from '../../../../core/Networking/types';
import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';

const QUERY_STALE_TIME_MS = 30_000;
const TokenAssetSchema = type({
  assetId: string(),
  symbol: string(),
  name: string(),
  decimals: number(),
  launchpadData: optional(
    nullable(
      type({
        launchedAt: optional(nullable(number())),
        description: optional(nullable(string())),
      }),
    ),
  ),
  holders: optional(nullable(type({ count: optional(nullable(number())) }))),
});
const TokenAssetsSchema = array(TokenAssetSchema);

type TokenAssetRecord = NonNullable<ReturnType<typeof parseTokenAsset>>;

export interface UseTokenAssetDetailsResult {
  asset: TokenAssetRecord | null;
  isLoading: boolean;
  isError: boolean;
}

function parseTokenAsset(body: unknown, assetId: string) {
  const assets = create(body, TokenAssetsSchema);
  const asset = assets.find(
    (item) => item.assetId.toLowerCase() === assetId.toLowerCase(),
  );
  if (!asset) return null;
  const { assetId: id, decimals, name, symbol, launchpadData, holders } = asset;
  return {
    assetId: id,
    decimals,
    name,
    symbol,
    launchpadData: launchpadData
      ? {
          launchedAt: launchpadData.launchedAt,
          description: launchpadData.description,
        }
      : null,
    holders: holders?.count == null ? null : { count: holders.count },
  };
}

/** Load public metadata for one token; prices and balances use separate queries. */
export function useTokenAssetDetails(
  assetId: string | null,
  baseUrl = TOKEN_API_BASE_URL,
): UseTokenAssetDetailsResult {
  const params = new URLSearchParams({
    assetIds: assetId ?? '',
    includeLaunchpadData: 'true',
    includeTopHolders: 'true',
  });
  const query = useNetworkQuery({
    queryKey: ['token-details', 'v2-assets', assetId, baseUrl],
    url: `${baseUrl}/v2/assets?${params.toString()}`,
    parse: (body) => parseTokenAsset(body, assetId ?? ''),
    enabled: Boolean(assetId),
    staleTime: QUERY_STALE_TIME_MS,
    cache: NetworkCache.SHORT,
    cacheProjection: {
      slot: 'token-details-metadata.v1',
      project: (asset) => {
        if (!asset) return undefined;
        const { holders: _holders, ...metadata } = asset;
        return [metadata];
      },
    },
  });

  return {
    asset: query.data ?? null,
    isLoading: Boolean(assetId) && query.isPending,
    isError: query.isError && !query.data,
  };
}
