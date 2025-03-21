import { useState, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import {
  TokenSearchResponseItem,
  TokenSearchParams,
} from '@metamask/token-search-discovery-controller';

const SEARCH_DEBOUNCE_DELAY = 50;
const MINIMUM_QUERY_LENGTH = 2;

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<TokenSearchResponseItem[]>([]);
  const latestRequestId = useRef<number>(0);

  const searchTokens = useMemo(
    () =>
      debounce(async (params: TokenSearchParams) => {
        setIsLoading(true);
        setError(null);
        const requestId = ++latestRequestId.current;

        if (!params.query || params.query.length < MINIMUM_QUERY_LENGTH) {
          setResults([]);
          setIsLoading(false);
          return;
        }

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
    [],
  );

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    searchTokens,
    recentSearches,
    isLoading,
    error,
    results,
    reset,
  };
};

export default useTokenSearchDiscovery;
