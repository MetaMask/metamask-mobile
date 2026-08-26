import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { CaipChainId } from '@metamask/utils';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';

import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import Engine from '../../../../core/Engine';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { getBaseSemVerVersion } from '../../../../util/version';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
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

type PopularTokensTraceResult = 'success' | 'cancelled' | 'error';

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

      const traceId = uuidv4();
      let traceResult: PopularTokensTraceResult = 'success';

      try {
        trace({
          name: TraceName.SwapPopularTokensFetch,
          op: TraceOperation.BridgeDataFetch,
          id: traceId,
          data: {
            chain_scope: chainIds.length > 1 ? 'multi_chain' : 'single_chain',
            chain_ids: chainIds.join(','),
          },
          startTime: Date.now(),
        });

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
          traceResult = 'error';
          console.error(
            `Failed to fetch popular tokens with status ${response.status}`,
          );
          return undefined;
        }

        const popularAssetsResponse: unknown = await response.json();
        if (!Array.isArray(popularAssetsResponse)) {
          traceResult = 'error';
          return undefined;
        }

        const popularTokens = popularAssetsResponse as PopularToken[];
        if (popularAssetsResponse.length > 0) {
          // Cache only valid top-level API payloads so malformed responses do
          // not suppress retries for the full cache TTL.
          setPopularTokensCache({
            includeAssets,
            chainIds,
            popularTokens,
          });
          return popularTokens;
        }

        return undefined;
      } catch (error) {
        // Ignore abort errors - request was intentionally cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          traceResult = 'cancelled';
          return undefined;
        }
        traceResult = 'error';
        console.error('Error fetching popular tokens:', error);
        return undefined;
      } finally {
        endTrace({
          name: TraceName.SwapPopularTokensFetch,
          id: traceId,
          timestamp: Date.now(),
          data: { result: traceResult },
        });
      }
    },
    [bearerToken],
  );
};
