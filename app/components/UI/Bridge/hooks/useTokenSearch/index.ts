import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { BridgeToken } from '../../types';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const MAX_TOKENS_RESULTS = 20;

interface UseTokenSearchProps {
  tokens: BridgeToken[];
}

interface UseTokenSearchResult {
  searchString: string;
  setSearchString: (text: string) => void;
  searchResults: BridgeToken[];
}

export function useTokenSearch({ tokens }: UseTokenSearchProps): UseTokenSearchResult {
  const [searchStringRaw, setSearchString] = useState('');
  const debouncedSearchString = useDebouncedValue<string>(searchStringRaw);

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
    () => (tokenFuse.search(debouncedSearchString)).slice(0, MAX_TOKENS_RESULTS).sort((a, b) => {
      // Sort results by balance fiat in descending order
      const balanceA = a.tokenFiatAmount ?? 0;
      const balanceB = b.tokenFiatAmount ?? 0;
      return balanceB - balanceA;
    }),
    [debouncedSearchString, tokenFuse],
  );

  const searchResults = tokenSearchResults;

  return {
    searchString: debouncedSearchString,
    setSearchString,
    searchResults,
  };
}
