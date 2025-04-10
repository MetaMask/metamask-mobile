import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { TokenIWithFiatAmount } from '../useTokensWithBalance';
const MAX_TOKENS_RESULTS = 20;

interface UseTokenSearchProps {
  tokens: TokenIWithFiatAmount[];
}

interface UseTokenSearchResult {
  searchString: string;
  setSearchString: (text: string) => void;
  searchResults: TokenIWithFiatAmount[];
}

export function useTokenSearch({ tokens }: UseTokenSearchProps): UseTokenSearchResult {
  const [searchString, setSearchString] = useState('');

  const tokenFuse = useMemo(
    () =>
      new Fuse(tokens || [], {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'name', 'address'],
      }),
    [tokens],
  );

  const tokenSearchResults = useMemo(
    () => (tokenFuse.search(searchString)).slice(0, MAX_TOKENS_RESULTS).sort((a, b) => {
      // Sort results by balance fiat in descending order
      const balanceA = a.tokenFiatAmount;
      const balanceB = b.tokenFiatAmount;
      return balanceB - balanceA;
    }),
    [searchString, tokenFuse],
  );

  const searchResults = tokenSearchResults;

  return {
    searchString,
    setSearchString,
    searchResults,
  };
}
