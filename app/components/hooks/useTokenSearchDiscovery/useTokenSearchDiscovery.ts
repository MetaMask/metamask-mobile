import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { selectRecentTokenSearches } from '../../../selectors/tokenSearchDiscoveryController';
import { TokenSearchParams } from '@metamask/token-search-discovery-controller/dist/types.cjs';

export const useTokenSearchDiscovery = () => {
  const recentSearches = useSelector(selectRecentTokenSearches);

  const searchTokens = useCallback(async (params: TokenSearchParams) => {
    const { TokenSearchDiscoveryController } = Engine.context;
    return await TokenSearchDiscoveryController.searchTokens(params);
  }, []);

  return {
    searchTokens,
    recentSearches,
  };
};

export default useTokenSearchDiscovery;
