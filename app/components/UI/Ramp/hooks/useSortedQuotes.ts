import useQuotes from './useQuotes';
import { useMemo } from 'react';
import { sortQuotes } from '../utils';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';

function useSortedQuotes(amount: number | string) {
  const { quotes, sorted, isFetching, error, query } = useQuotes(amount);

  const quotesByPrice = useMemo(
    () => sortQuotes(quotes, sorted, QuoteSortBy.price),
    [quotes, sorted],
  );

  const quotesByReliability = useMemo(
    () => sortQuotes(quotes, sorted, QuoteSortBy.reliability),
    [quotes, sorted],
  );

  return {
    quotes,
    quotesByPrice,
    quotesByReliability,
    sorted,
    isFetching,
    error,
    query,
  };
}

export default useSortedQuotes;
