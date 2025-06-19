import { useState, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../../core/Engine';
import { selectRecentTokenSearches } from '../../../../selectors/tokenSearchDiscoveryController';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';
import { tokenSearchDiscoveryEnabled } from '../../../../selectors/featureFlagController/tokenSearchDiscovery';

const SEARCH_DEBOUNCE_DELAY = 250;
const MINIMUM_QUERY_LENGTH = 2;
export const MAX_RESULTS = '20';

export const useTokenSearch = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<MoralisTokenResponseItem[]>([]);
  const latestRequestId = useRef<number>(0);
  const tokenSearchEnabled = useSelector(tokenSearchDiscoveryEnabled);
  const latestSearchTermWithoutResults = useRef<string | null>(null);

  const searchTokens = useMemo(
    () =>
      debounce(async (query: string) => {
        setIsLoading(true);
        setError(null);

        if (
          query.length < MINIMUM_QUERY_LENGTH ||
          !tokenSearchEnabled ||
          query.trim() === '' ||
          query.match(/^https?:\/\//) ||
          query.startsWith('www.') ||
          latestSearchTermWithoutResults.current && query.startsWith(latestSearchTermWithoutResults.current)
        ) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const requestId = ++latestRequestId.current;

        try {
          const { TokenSearchDiscoveryController } = Engine.context;
          const result = await TokenSearchDiscoveryController.searchTokensFormatted({
            query,
            limit: MAX_RESULTS,
            swappable: true,
          });
          if (requestId === latestRequestId.current) {
            setResults(result);
            if (result.length === 0) {
              latestSearchTermWithoutResults.current = query;
            } else {
              latestSearchTermWithoutResults.current = null;
            }
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
    [tokenSearchEnabled],
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

export default useTokenSearch;
