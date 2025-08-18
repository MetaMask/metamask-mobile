import { useState, useMemo } from 'react';
import { AssetType } from '../../types/token';

export interface UseTokenSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTokens: AssetType[];
  clearSearch: () => void;
}

export function useTokenSearch(tokens: AssetType[]): UseTokenSearchReturn {
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

  const clearSearch = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredTokens,
    clearSearch,
  };
}
