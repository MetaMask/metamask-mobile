import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { TokenI } from '../Tokens/types';

const MAX_TOKENS_RESULTS = 20;

interface UseTokenSearchProps {
  tokens: TokenI[];
}

interface UseTokenSearchResult {
  searchString: string;
  setSearchString: (text: string) => void;
  searchResults: TokenI[];
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
        keys: ['symbol', 'address', 'name'],
      }),
    [tokens],
  );

  const tokenSearchResults = useMemo(
    () => (tokenFuse.search(searchString)).slice(0, MAX_TOKENS_RESULTS),
    [searchString, tokenFuse],
  );

  const searchResults = searchString.length > 0 ? tokenSearchResults : tokens;

  return {
    searchString,
    setSearchString,
    searchResults,
  };
}
