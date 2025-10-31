import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import { PopularToken } from './usePopularTokens';

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
  excludeAssetIds: string; // Stringified array to prevent unnecessary re-renders
}

interface UseSearchTokensResult {
  searchResults: PopularToken[];
  isSearchLoading: boolean;
  isLoadingMore: boolean;
  searchCursor: string | undefined;
  searchTokens: (query: string, cursor?: string) => Promise<void>;
  debouncedSearch: ReturnType<typeof debounce>;
  resetSearch: () => void;
}

/**
 * Custom hook to search tokens via the Bridge API
 * @param params - Configuration object containing chainIds and excludeAssetIds
 * @returns Object containing search results, loading states, and search functions
 */
export const useSearchTokens = ({
  chainIds,
  excludeAssetIds,
}: UseSearchTokensParams): UseSearchTokensResult => {
  const [searchResults, setSearchResults] = useState<PopularToken[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const currentSearchQueryRef = useRef<string>('');

  const resetSearch = useCallback(() => {
    setSearchResults([]);
    setSearchCursor(undefined);
    currentSearchQueryRef.current = '';
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
      }

      try {
        const parsedExcludeAssetIds = JSON.parse(excludeAssetIds);

        const requestBody: {
          chainIds: CaipChainId[];
          query: string;
          after?: string;
          excludeAssetIds?: string[];
        } = {
          chainIds,
          query: query.trim(),
        };

        if (cursor) {
          requestBody.after = cursor;
        }

        if (parsedExcludeAssetIds) {
          requestBody.excludeAssetIds = parsedExcludeAssetIds;
        }

        const response = await fetch(
          'https://bridge.dev-api.cx.metamask.io/getTokens/search',
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
    [chainIds, excludeAssetIds, resetSearch],
  );

  // Create debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        searchTokens(query);
      }, 300),
    [searchTokens],
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
    searchTokens,
    debouncedSearch,
    resetSearch,
  };
};
