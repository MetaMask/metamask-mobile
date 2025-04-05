import { useMemo } from 'react';
import useSortedQuotes from './useSortedQuotes';
import { useSelector } from 'react-redux';
import { getOrdersProviders } from '../../../../reducers/fiatOrders';

function useQuotesAndCustomActions(amount: number | string) {
  const ordersProviders = useSelector(getOrdersProviders);

  const sortedQuotes = useSortedQuotes(amount);

  const { recommendedQuote, customActions } = sortedQuotes;

  const recommendedCustomAction = useMemo(() => {
    if (
      customActions &&
      customActions?.length > 0 &&
      (!recommendedQuote ||
        !ordersProviders.includes(recommendedQuote.provider.id))
    ) {
      return customActions[0];
    }
  }, [customActions, ordersProviders, recommendedQuote]);

  return {
    recommendedCustomAction,
    ...sortedQuotes,
  };
}

export default useQuotesAndCustomActions;
