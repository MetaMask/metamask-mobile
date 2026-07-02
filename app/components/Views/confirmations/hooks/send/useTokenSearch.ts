import { useState, useMemo } from 'react';
import { AssetType, Nft } from '../../types/token';
import { isNetworkTestnet, NETWORK_FILTER_ALL } from './useNetworkFilter';

export interface UseTokenSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTokens: AssetType[];
  filteredNfts: Nft[];
  clearSearch: () => void;
}

export function useTokenSearch(
  tokens: AssetType[],
  nfts: Nft[],
  selectedNetworkFilter?: string,
): UseTokenSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return tokens;
    }

    const query = searchQuery.toLowerCase().trim();

    return tokens.filter((token) => {
      if (token?.address?.toLowerCase().includes(query)) {
        return true;
      }

      if (token?.name?.toLowerCase().includes(query)) {
        return true;
      }

      if (token?.symbol?.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [tokens, searchQuery]);

  const filteredNfts = useMemo(() => {
    let nftsToFilter = nfts;

    if (selectedNetworkFilter && selectedNetworkFilter !== NETWORK_FILTER_ALL) {
      nftsToFilter = nfts.filter(
        (nft) => nft.chainId === selectedNetworkFilter,
      );
    }

    if (selectedNetworkFilter === NETWORK_FILTER_ALL) {
      // Testnet NFTs are excluded from "All networks" and only shown when
      // their network is explicitly selected
      nftsToFilter = nfts.filter((nft) => !isNetworkTestnet(nft.chainId));
    }

    if (!searchQuery.trim()) {
      return nftsToFilter;
    }

    const query = searchQuery.toLowerCase().trim();

    return nftsToFilter.filter((nft) => {
      if (nft?.name?.toLowerCase().includes(query)) {
        return true;
      }

      if (nft?.collectionName?.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [nfts, searchQuery, selectedNetworkFilter]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredTokens,
    filteredNfts,
    clearSearch,
  };
}
