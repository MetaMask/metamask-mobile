import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useDebouncedValue } from '../useDebouncedValue';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import type { TokenSearchParams } from '@metamask/token-search-discovery-controller/dist/types.d.cts';

const SEARCH_DEBOUNCE_DELAY = 300;

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);

  const searchTokens = useCallback(async (params: TokenSearchParams) => {
    const debouncedParams = useDebouncedValue(params, SEARCH_DEBOUNCE_DELAY);
    const { TokenSearchDiscoveryController } = Engine.context;
    return await TokenSearchDiscoveryController.searchTokens(debouncedParams);
  }, []);

  return {
    searchTokens,
    recentSearches,
  };
};

export default useTokenSearchDiscovery;
