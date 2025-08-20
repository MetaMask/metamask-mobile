import { useState, useMemo } from 'react';
import { AssetType } from '../../types/token';
import { type NetworkInfo } from './useNetworks';

export const NETWORK_FILTER_ALL = 'all';

export interface UseNetworkFilterResult {
  selectedNetworkFilter: string;
  setSelectedNetworkFilter: (filter: string) => void;
  filteredTokensByNetwork: AssetType[];
  networksWithTokens: NetworkInfo[];
}

export const useNetworkFilter = (
  tokens: AssetType[],
  networks: NetworkInfo[],
): UseNetworkFilterResult => {
  const [selectedNetworkFilter, setSelectedNetworkFilter] =
    useState(NETWORK_FILTER_ALL);

  const networksWithTokens = useMemo(() => {
    const tokenChainIds = new Set(tokens.map((token) => token.chainId));
    return networks.filter((network) => tokenChainIds.has(network.chainId));
  }, [tokens, networks]);

  const filteredTokensByNetwork = useMemo(() => {
    if (selectedNetworkFilter === NETWORK_FILTER_ALL) {
      return tokens;
    }

    return tokens.filter((token) => token.chainId === selectedNetworkFilter);
  }, [tokens, selectedNetworkFilter]);

  return {
    selectedNetworkFilter,
    setSelectedNetworkFilter,
    filteredTokensByNetwork,
    networksWithTokens,
  };
};
