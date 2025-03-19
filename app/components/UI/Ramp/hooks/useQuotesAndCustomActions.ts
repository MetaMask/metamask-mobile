import { useMemo } from 'react';
import useSortedQuotes from './useSortedQuotes';
import { useSelector } from 'react-redux';
import { getOrdersProviders } from '../../../../reducers/fiatOrders';

function useQuotesAndCustomActions(amount: number | string) {
  const ordersProviders = useSelector(getOrdersProviders);

  const sortedQuotes = useSortedQuotes(amount);

  const { recommendedQuote, customActions } = sortedQuotes;

  const customActionOrRecommendedQuote = useMemo(() => {
    if (customActions && customActions.length > 0) {
      if (
        recommendedQuote &&
        ordersProviders.includes(recommendedQuote.provider.id)
      ) {
        return recommendedQuote;
      }
      return customActions[0];
    }

    return recommendedQuote;
  }, [customActions, ordersProviders, recommendedQuote]);

  const isRecommendedQuoteACustomAction =
    customActionOrRecommendedQuote &&
    !('provider' in customActionOrRecommendedQuote);

  return {
    isRecommendedQuoteACustomAction,
    customActionOrRecommendedQuote,
    ...sortedQuotes,
  };
}

export default useQuotesAndCustomActions;
