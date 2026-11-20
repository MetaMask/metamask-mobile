import { handleFetch } from '@metamask/controller-utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { TOKEN_API_BASE_URL } from '../../../../UI/Assets/watchlist/utils/getTokens';

/** Token API v3 endpoints backing the Explore crypto pills. */
export type CryptoPillEndpointPath =
  | '/v3/tokens/trending'
  | '/v3/tokens/top-gainers'
  | '/v3/tokens/popular';

/** Token API request params shared by every crypto pill definition. */
export interface CryptoPillRequestParams {
  path: CryptoPillEndpointPath;
  sort?: string;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  excludeLabels?: string[];
  includeTokenSecurityData?: boolean;
  /** Price-source and RWA parity flags the token API client defaults to true for the trending endpoint. */
  usePriceApiData?: boolean;
  includeRwaData?: boolean;
}

/** Fully resolved request for a single pill fetch. */
export interface CryptoPillTokensRequest extends CryptoPillRequestParams {
  chainIds: CaipChainId[];
  vsCurrency?: string;
  signal?: AbortSignal;
}

export const CRYPTO_PILL_QUERY_KEY_ROOT = 'explore-crypto-pill';

export const cryptoPillQueryKeys = {
  all: [CRYPTO_PILL_QUERY_KEY_ROOT] as const,
  /** Prefix matching every query for one pill, across chains and currencies. */
  pillRoot: (pillKey: string) => [CRYPTO_PILL_QUERY_KEY_ROOT, pillKey] as const,
  pill: (pillKey: string, chainKey: string, vsCurrency: string) =>
    [CRYPTO_PILL_QUERY_KEY_ROOT, pillKey, chainKey, vsCurrency] as const,
};

/**
 * Builds the Token API URL for a crypto pill request. `chainIds` and
 * `excludeLabels` are joined with literal commas because the API expects
 * comma-separated values, not percent-encoded ones.
 */
export const buildCryptoPillTokensUrl = (
  request: Omit<CryptoPillTokensRequest, 'signal'>,
): string => {
  const { path, chainIds, excludeLabels, ...rest } = request;
  const queryParams = new URLSearchParams();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  const encodedChainIds = chainIds.map(encodeURIComponent).join(',');
  const excludeLabelsParam =
    excludeLabels !== undefined && excludeLabels.length > 0
      ? `&excludeLabels=${excludeLabels.join(',')}`
      : '';
  return `${TOKEN_API_BASE_URL}${path}?chainIds=${encodedChainIds}${queryParams.toString() ? `&${queryParams.toString()}` : ''}${excludeLabelsParam}`;
};

/** Fetches tokens for a single crypto pill from the Token API. */
export const fetchCryptoPillTokens = async (
  request: CryptoPillTokensRequest,
): Promise<TrendingAsset[]> => {
  const { signal, ...urlRequest } = request;
  const response = await handleFetch(
    buildCryptoPillTokensUrl(urlRequest),
    signal ? { signal } : undefined,
  );
  if (!Array.isArray(response)) {
    throw new Error('Crypto pill tokens response was not an array');
  }
  return response as TrendingAsset[];
};
