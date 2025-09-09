import { useState, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
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
    const filteredNetworks = networks.filter((network) =>
      tokenChainIds.has(network.chainId),
    );

    return filteredNetworks.sort((networkA, networkB) => {
      const networkATotal = tokens
        .filter((token) => token.chainId === networkA.chainId)
        .reduce((sum, token) => {
          const fiatBalance = token.fiat?.balance || '0';
          return sum.plus(new BigNumber(fiatBalance));
        }, new BigNumber(0));

      const networkBTotal = tokens
        .filter((token) => token.chainId === networkB.chainId)
        .reduce((sum, token) => {
          const fiatBalance = token.fiat?.balance || '0';
          return sum.plus(new BigNumber(fiatBalance));
        }, new BigNumber(0));

      return networkBTotal.comparedTo(networkATotal) || 0;
    });
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
