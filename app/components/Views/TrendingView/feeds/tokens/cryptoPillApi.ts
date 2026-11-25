import { handleFetch } from '@metamask/controller-utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { TOKEN_API_BASE_URL } from '../../../../UI/Assets/watchlist/utils/getTokens';

export type CryptoPillEndpointPath =
  | '/v3/tokens/trending'
  | '/v3/tokens/top-gainers'
  | '/v3/tokens/popular';

export interface CryptoPillRequestParams {
  path: CryptoPillEndpointPath;
  sort?: string;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  excludeLabels?: string[];
  includeTokenSecurityData?: boolean;
  usePriceApiData?: boolean;
  includeRwaData?: boolean;
}

export interface CryptoPillTokensRequest extends CryptoPillRequestParams {
  chainIds: CaipChainId[];
  vsCurrency?: string;
  signal?: AbortSignal;
}

export const CRYPTO_PILL_QUERY_KEY_ROOT = 'explore-crypto-pill';

export const cryptoPillQueryKeys = {
  all: [CRYPTO_PILL_QUERY_KEY_ROOT] as const,
  pillRoot: (pillKey: string) => [CRYPTO_PILL_QUERY_KEY_ROOT, pillKey] as const,
  pill: (pillKey: string, chainKey: string, vsCurrency: string) =>
    [CRYPTO_PILL_QUERY_KEY_ROOT, pillKey, chainKey, vsCurrency] as const,
};

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

  const queryParamsString = queryParams.toString()
    ? `&${queryParams.toString()}`
    : '';
  return `${TOKEN_API_BASE_URL}${path}?chainIds=${encodedChainIds}${queryParamsString}${excludeLabelsParam}`;
};

export const fetchCryptoPillTokens = async (
  request: CryptoPillTokensRequest,
): Promise<TrendingAsset[]> => {
  const { signal, ...urlRequest } = request;
  const response = await handleFetch(
    buildCryptoPillTokensUrl(urlRequest),
    signal ? { signal } : undefined,
  );
  if (!Array.isArray(response)) {
    throw new TypeError('Crypto pill tokens response was not an array');
  }
  return response as TrendingAsset[];
};
