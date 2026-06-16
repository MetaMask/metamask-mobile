import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';

import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import Engine from '../../../../core/Engine';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { getBaseSemVerVersion } from '../../../../util/version';
import type { IncludeAsset, PopularToken } from '../types';
import {
  cleanupExpiredEntries,
  getCacheKey,
  isCacheValid,
  popularTokensCache,
  setPopularTokensCache,
} from '../utils/cacheUtils';

export interface FetchPopularTokensParams {
  chainIds: CaipChainId[];
  includeAssets?: IncludeAsset[];
  signal?: AbortSignal;
}

/**
 * Lightweight fetcher hook for the Bridge `/getTokens/popular` endpoint.
 * @returns A callback that performs the cached fetch for the supplied
 */
export const useFetchPopularTokens = () => {
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  useEffect(() => {
    if (!isBasicFunctionalityEnabled) {
      return;
    }
    Engine.context.AuthenticationController.getBearerToken()
      .then((token) => {
        setBearerToken(token);
      })
      .catch((error) => {
        console.warn(
          'Failed to get bearer token for /getTokens/popular',
          error,
        );
      });
  }, [isBasicFunctionalityEnabled]);

  return useCallback(
    async ({
      chainIds,
      includeAssets = [],
      signal,
    }: FetchPopularTokensParams): Promise<PopularToken[] | undefined> => {
      cleanupExpiredEntries();

      const cacheKey = getCacheKey(chainIds, includeAssets);
      const cachedEntry = popularTokensCache.get(cacheKey);
      if (cachedEntry && isCacheValid(cachedEntry)) {
        return cachedEntry.data;
      }

      try {
        const response = await fetch(
          `${BRIDGE_API_BASE_URL}/getTokens/popular`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getClientHeaders({
                clientId: BridgeClientId.MOBILE,
                clientVersion: getBaseSemVerVersion(),
                jwt: bearerToken ?? '',
              }),
            },
            body: JSON.stringify({ chainIds, includeAssets }),
            signal,
          },
        );

        if (response.ok === false) {
          console.error(
            `Failed to fetch popular tokens with status ${response.status}`,
          );
          return undefined;
        }

        const popularAssetsResponse: PopularToken[] = await response.json();
        const isValidTopLevelPayload = Array.isArray(popularAssetsResponse);

        if (isValidTopLevelPayload && popularAssetsResponse.length > 0) {
          // Cache only valid top-level API payloads so malformed responses do
          // not suppress retries for the full cache TTL.
          setPopularTokensCache({
            includeAssets,
            chainIds,
            popularTokens: popularAssetsResponse,
          });
          return popularAssetsResponse;
        }

        return undefined;
      } catch (error) {
        // Ignore abort errors - request was intentionally cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          return undefined;
        }
        console.error('Error fetching popular tokens:', error);
        return undefined;
      }
    },
    [bearerToken],
  );
};
