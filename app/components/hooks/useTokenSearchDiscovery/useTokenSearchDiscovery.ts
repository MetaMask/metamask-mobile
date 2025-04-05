import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import {
  TokenSearchResponseItem,
  TokenSearchParams,
} from '@metamask/token-search-discovery-controller';
import { Hex } from '@metamask/utils';
import { selectSupportedSwapTokenAddressesByChainId } from '../../../selectors/tokenSearchDiscoveryDataController';

const SEARCH_DEBOUNCE_DELAY = 50;
const MINIMUM_QUERY_LENGTH = 2;
export const MAX_RESULTS = '100';

export type SearchDiscoveryParams = Omit<TokenSearchParams, 'limit'>;

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<TokenSearchResponseItem[]>([]);
  const latestRequestId = useRef<number>(0);

  useEffect(() => {
    const chainIds = results.reduce((acc, result) => {
      if (!acc.includes(result.chainId as Hex)) {
        acc.push(result.chainId as Hex);
      }
      return acc;
    }, [] as Hex[]);

    for (const chainId of chainIds) {
      Engine.context.TokenSearchDiscoveryDataController.fetchSwapsTokens(chainId);
    }

  }, [results]);

  const swapsTokenAddresses = useSelector(selectSupportedSwapTokenAddressesByChainId);

  const filteredResults = useMemo(() => results.filter((result) => {
      const chainId = result.chainId as Hex;
      const tokenAddresses = swapsTokenAddresses[chainId];
      return tokenAddresses?.addresses.includes(result.tokenAddress);
    }), [results, swapsTokenAddresses]);

  const searchTokens = useMemo(
    () =>
      debounce(async (params: SearchDiscoveryParams) => {
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
          const result = await TokenSearchDiscoveryController.searchTokens({
            ...params,
            limit: MAX_RESULTS,
          });
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
    results: filteredResults,
    reset,
  };
};

export default useTokenSearchDiscovery;
