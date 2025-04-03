import useQuotes from './useQuotes';
import { useMemo } from 'react';
import { sortQuotes } from '../utils';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';
import { useSelector } from 'react-redux';
import { getOrdersProviders } from '../../../../reducers/fiatOrders';
import {
  QuoteError,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';

function useSortedQuotes(amount: number | string) {
  const ordersProviders = useSelector(getOrdersProviders);
  const { quotes, customActions, sorted, isFetching, error, query } =
    useQuotes(amount);

  const quotesWithoutError: (QuoteResponse | SellQuoteResponse)[] = useMemo(
    () =>
      quotes?.filter(
        (quote): quote is QuoteResponse | SellQuoteResponse => !quote.error,
      ) || [],
    [quotes],
  );

  const quotesWithError = useMemo(
    () =>
      quotes?.filter((quote): quote is QuoteError => Boolean(quote.error)) ||
      [],
    [quotes],
  );

  const quotesByPriceWithoutError = useMemo(
    () => sortQuotes(quotesWithoutError, sorted, QuoteSortBy.price) || [],
    [quotesWithoutError, sorted],
  );

  const quotesByReliabilityWithoutError = useMemo(
    () => sortQuotes(quotesWithoutError, sorted, QuoteSortBy.reliability) || [],
    [quotesWithoutError, sorted],
  );

  const recommendedQuote = useMemo(() => {
    if (quotes) {
      const previouslyUsedQuote = quotesWithoutError.find(({ provider }) =>
        ordersProviders.includes(provider.id),
      );

      if (previouslyUsedQuote) {
        return previouslyUsedQuote;
      }

      if (quotesByReliabilityWithoutError?.length > 0) {
        return quotesByReliabilityWithoutError[0];
      }

      if (quotesByPriceWithoutError?.length > 0) {
        return quotesByPriceWithoutError[0];
      }
    }

    return undefined;
  }, [
    ordersProviders,
    quotes,
    quotesByPriceWithoutError,
    quotesByReliabilityWithoutError,
    quotesWithoutError,
  ]);

  return {
    quotes,
    customActions,
    quotesWithoutError,
    quotesWithError,
    quotesByPriceWithoutError,
    quotesByReliabilityWithoutError,
    recommendedQuote,
    sorted,
    isFetching,
    error,
    query,
  };
}

export default useSortedQuotes;
