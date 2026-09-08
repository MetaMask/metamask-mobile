import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { CaipChainId } from '@metamask/utils';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import Engine from '../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../util/version';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { IncludeAsset, PopularToken } from '../types';

const MIN_SEARCH_LENGTH = 3;

interface SearchTokensResponse {
  data: PopularToken[];
  count: number;
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

type SearchTraceResult = 'success' | 'error';

interface UseSearchTokensParams {
  chainIds: CaipChainId[];
  includeAssets: IncludeAsset[];
}

interface UseSearchTokensResult {
  searchResults: (PopularToken | IncludeAsset)[];
  isSearchLoading: boolean;
  isLoadingMore: boolean;
  searchCursor: string | undefined;
  currentSearchQuery: string;
  searchTokens: (query: string, cursor?: string) => Promise<void>;
  debouncedSearch: ReturnType<typeof debounce>;
  resetSearch: () => void;
}

const getBucket = (
  value: number,
  thresholds: readonly number[],
  labels: readonly string[],
): string => {
  const index = thresholds.findIndex((threshold) => value <= threshold);
  return labels[index === -1 ? labels.length - 1 : index];
};

const getQueryLengthBucket = (length: number): string =>
  getBucket(length, [2, 5, 10], ['0-2', '3-5', '6-10', '11+']);

const getResultCountBucket = (count: number): string =>
  getBucket(count, [0, 5, 20], ['0', '1-5', '6-20', '21+']);

/**
 * Custom hook to search tokens via the Bridge API
 * @param params - Configuration object containing chainIds and includeAssets
 * @returns Object containing search results, loading states, and search functions
 */
export const useSearchTokens = ({
  chainIds,
  includeAssets,
}: UseSearchTokensParams): UseSearchTokensResult => {
  const [searchResults, setSearchResults] = useState<PopularToken[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  // Consumers need to distinguish "waiting for debounce" from "search returned 0 results"
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');
  const currentSearchQueryRef = useRef<string>('');

  // Use refs to store the latest values without causing re-renders or callback recreation
  const chainIdsRef = useRef(chainIds);
  const includeAssetsRef = useRef(includeAssets);

  // Update refs when values change
  useEffect(() => {
    chainIdsRef.current = chainIds;
  }, [chainIds]);

  useEffect(() => {
    includeAssetsRef.current = includeAssets;
  }, [includeAssets]);

  useEffect(() => {
    Engine.context.AuthenticationController.getBearerToken()
      .then((token) => {
        setBearerToken(token);
      })
      .catch((error) => {
        console.warn('Failed to get bearer token for /getTokens/search', error);
      });
  }, []);

  const resetSearch = useCallback(() => {
    setSearchResults([]);
    setSearchCursor(undefined);
    currentSearchQueryRef.current = '';
    setCurrentSearchQuery('');
  }, []);

  const searchTokens = useCallback(
    async (query: string, cursor?: string) => {
      if (!query.trim()) {
        // If query is empty, reset search state
        resetSearch();
        return;
      }

      // Determine if this is a pagination request (same query with cursor)
      const isPagination =
        cursor && currentSearchQueryRef.current === query.trim();

      if (isPagination) {
        setIsLoadingMore(true);
      } else {
        setIsSearchLoading(true);
        currentSearchQueryRef.current = query.trim();
        setCurrentSearchQuery(query.trim());
        setSearchResults([]);
      }

      let traceId: string | undefined;
      let traceResult: SearchTraceResult = 'success';
      let resultCount = 0;

      try {
        const requestBody: {
          chainIds: CaipChainId[];
          query: string;
          after?: string;
          includeAssets?: IncludeAsset[];
        } = {
          chainIds: chainIdsRef.current,
          query: query.trim(),
        };

        if (cursor) {
          requestBody.after = cursor;
        }

        if (includeAssetsRef.current && !isPagination) {
          requestBody.includeAssets = includeAssetsRef.current;
        }

        if (!isPagination) {
          traceId = uuidv4();
          trace({
            name: TraceName.SwapTokenSearch,
            op: TraceOperation.BridgeDataFetch,
            id: traceId,
            data: {
              chain_scope:
                chainIdsRef.current.length > 1 ? 'multi_chain' : 'single_chain',
              query_length_bucket: getQueryLengthBucket(query.trim().length),
            },
            startTime: Date.now(),
          });
        }

        const response = await fetch(
          `${BRIDGE_API_BASE_URL}/getTokens/search`,
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
            body: JSON.stringify(requestBody),
          },
        );
        if (response.ok === false) {
          throw new Error(
            `Failed to search tokens with status ${response.status}`,
          );
        }

        const searchData: Partial<SearchTokensResponse> = await response.json();
        const searchResultData: PopularToken[] = Array.isArray(searchData.data)
          ? searchData.data
          : [];
        resultCount = searchResultData.length;

        // Store the cursor for pagination if there's a next page
        setSearchCursor(
          searchData.pageInfo?.hasNextPage
            ? searchData.pageInfo.endCursor
            : undefined,
        );

        // If this is a pagination request, append to existing results
        // Otherwise, replace results (initial search)
        if (isPagination) {
          setSearchResults((prevResults) => [
            ...prevResults,
            ...searchResultData,
          ]);
        } else {
          setSearchResults(searchResultData);
        }
      } catch (error) {
        traceResult = 'error';
        console.error('Error searching tokens:', error);
        // Reset search state on error only if it's not a pagination request
        if (!isPagination) {
          setSearchCursor(undefined);
        }
      } finally {
        if (traceId) {
          endTrace({
            name: TraceName.SwapTokenSearch,
            id: traceId,
            timestamp: Date.now(),
            data: {
              result: traceResult,
              result_count_bucket: getResultCountBucket(resultCount),
            },
          });
        }

        if (isPagination) {
          setIsLoadingMore(false);
        } else {
          setIsSearchLoading(false);
        }
      }
    },
    [bearerToken, resetSearch],
  );

  // Create debounced search function
  // Only triggers search when query meets minimum length requirement
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setSearchResults([]);
        const queryLength = query.trim().length;
        // Only search if query meets minimum length
        if (queryLength >= MIN_SEARCH_LENGTH) {
          searchTokens(query);
        } else if (queryLength === 0) {
          // Reset search if query is empty
          resetSearch();
        }
        // If query is below minimum length but not empty, do nothing (don't search or reset)
      }, 300),
    [searchTokens, resetSearch],
  );

  // Cleanup debounce on unmount
  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch],
  );

  return {
    searchResults: searchResults.length > 0 ? searchResults : includeAssets,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    currentSearchQuery,
    searchTokens,
    debouncedSearch,
    resetSearch,
  };
};
