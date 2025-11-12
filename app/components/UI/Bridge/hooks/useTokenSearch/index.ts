import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { throttle } from 'lodash';
import { BridgeToken } from '../../types';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const THROTTLE_MS = 1250; // Throttle token updates to max once per second
const MAX_TOKENS_RESULTS = 20;

interface UseTokenSearchProps {
  tokens: BridgeToken[];
}

interface UseTokenSearchResult {
  searchString: string;
  debouncedSearchString: string;
  setSearchString: (text: string) => void;
  searchResults: BridgeToken[];
}

export function useTokenSearch({
  tokens,
}: UseTokenSearchProps): UseTokenSearchResult {
  const [searchString, setSearchString] = useState('');
  const debouncedSearchString = useDebouncedValue<string>(searchString);
  // We start with empty array to avoid initial expensive initialization of Fuse instance,
  // because it's immediately replaced with new instance during intial 1s anyway (useAsyncResult in useTopTokens triggest it)
  const [throttledTokens, setThrottledTokens] = useState<BridgeToken[]>([]);

  // Create stable throttled setter that persists across renders
  const throttledSetTokens = useRef(
    throttle((newTokens: BridgeToken[]) => {
      setThrottledTokens(newTokens);
    }, THROTTLE_MS),
  ).current;

  useEffect(() => {
    throttledSetTokens(tokens);
  }, [tokens, throttledSetTokens]);

  const tokenFuse = useMemo(() => {
    const result = new Fuse(throttledTokens || [], {
      shouldSort: true,
      threshold: 0.45,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: ['symbol', 'name', 'address'],
    });
    return result;
  }, [throttledTokens]);

  const tokenSearchResults = useMemo(
    () =>
      tokenFuse
        .search(debouncedSearchString, { limit: MAX_TOKENS_RESULTS })
        .sort((a, b) => {
          // Sort results by balance fiat in descending order
          const balanceA = a.tokenFiatAmount ?? 0;
          const balanceB = b.tokenFiatAmount ?? 0;
          return balanceB - balanceA;
        }),
    [debouncedSearchString, tokenFuse],
  );

  const searchResults = tokenSearchResults;

  return {
    searchString,
    debouncedSearchString,
    setSearchString,
    searchResults,
  };
}
