import { useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import {
  TokenSearchResponseItem,
  TokenSearchParams,
} from '@metamask/token-search-discovery-controller';

const SEARCH_DEBOUNCE_DELAY = 300;

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<TokenSearchResponseItem[]>([]);
  const latestRequestId = useRef<number>(0);

  const debouncedSearch = useCallback(
    debounce(async (params: TokenSearchParams, requestId: number) => {
      try {
        const { TokenSearchDiscoveryController } = Engine.context;
        const result = await TokenSearchDiscoveryController.searchTokens(
          params,
        );
        if (requestId === latestRequestId.current) {
          setResults(result);
        }
      } catch (err) {
        if (requestId === latestRequestId.current) {
          setError(err as Error);
        }
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_DELAY),
    [setResults, setError, setIsLoading, latestRequestId],
  );

  const searchTokens = useCallback(
    (params: TokenSearchParams) => {
      setIsLoading(true);
      setError(null);
      latestRequestId.current += 1;
      debouncedSearch(params, latestRequestId.current);
    },
    [debouncedSearch],
  );

  return {
    searchTokens,
    recentSearches,
    isLoading,
    error,
    results,
  };
};

export default useTokenSearchDiscovery;
