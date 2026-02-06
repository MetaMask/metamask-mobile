import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import { PopularToken, IncludeAsset } from './usePopularTokens';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';

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

interface UseSearchTokensParams {
  chainIds: CaipChainId[];
  includeAssets: string; // Stringified array to prevent unnecessary re-renders
}

interface UseSearchTokensResult {
  searchResults: PopularToken[];
  isSearchLoading: boolean;
  isLoadingMore: boolean;
  searchCursor: string | undefined;
  currentSearchQuery: string;
  searchTokens: (query: string, cursor?: string) => Promise<void>;
  debouncedSearch: ReturnType<typeof debounce>;
  resetSearch: () => void;
}

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
      }

      try {
        const parsedIncludeAssets: IncludeAsset[] = isPagination
          ? []
          : JSON.parse(includeAssetsRef.current);

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

        if (parsedIncludeAssets) {
          requestBody.includeAssets = parsedIncludeAssets;
        }

        const response = await fetch(
          `${BRIDGE_API_BASE_URL}/getTokens/search`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          },
        );
        const searchData: SearchTokensResponse = await response.json();

        // Store the cursor for pagination if there's a next page
        setSearchCursor(
          searchData.pageInfo.hasNextPage
            ? searchData.pageInfo.endCursor
            : undefined,
        );

        // If this is a pagination request, append to existing results
        // Otherwise, replace results (initial search)
        if (isPagination) {
          setSearchResults((prevResults) => [
            ...prevResults,
            ...searchData.data,
          ]);
        } else {
          setSearchResults(searchData.data);
        }
      } catch (error) {
        console.error('Error searching tokens:', error);
        // Reset search state on error only if it's not a pagination request
        if (!isPagination) {
          setSearchResults([]);
          setSearchCursor(undefined);
        }
      } finally {
        if (isPagination) {
          setIsLoadingMore(false);
        } else {
          setIsSearchLoading(false);
        }
      }
    },
    [resetSearch],
  );

  // Create debounced search function
  // Only triggers search when query meets minimum length requirement
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
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
    searchResults,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    currentSearchQuery,
    searchTokens,
    debouncedSearch,
    resetSearch,
  };
};
