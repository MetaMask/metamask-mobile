import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import type {
  TokenSearchParams,
  TokenSearchResponseItem,
} from '@metamask/token-search-discovery-controller/dist/types.d.cts';

const SEARCH_DEBOUNCE_DELAY = 300;

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<TokenSearchResponseItem[]>([]);

  const searchTokens = useCallback((params: TokenSearchParams) => {
    setIsLoading(true);
    setError(null);

    const debouncedSearch = debounce(async () => {
      try {
        const { TokenSearchDiscoveryController } = Engine.context;
        const result = await TokenSearchDiscoveryController.searchTokens(
          params,
        );
        setResults(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_DELAY);

    debouncedSearch();
  }, []);

  return {
    searchTokens,
    recentSearches,
    isLoading,
    error,
    results,
  };
};

export default useTokenSearchDiscovery;
