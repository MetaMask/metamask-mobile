import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { DepositCryptoCurrency } from '../constants';

function useSearchTokenResults({
  tokens,
  searchString,
}: {
  tokens: DepositCryptoCurrency[];
  searchString: string;
}) {
  const tokenFuse = useMemo(
    () =>
      new Fuse(tokens, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'address', 'name', 'chainId'],
      }),
    [tokens],
  );
  if (!searchString || tokens.length === 0) {
    return tokens;
  }

  const results = tokenFuse.search(searchString);

  if (results.length === 0) {
    return [];
  }

  return results;
}

export default useSearchTokenResults;
