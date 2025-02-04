import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { useMemo } from 'react';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';

function useQuotes(amount: number | string) {
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
    isBuy,
  } = useRampSDK();
  const [{ data, isFetching, error }, query] = useSDKMethod(
    isBuy ? 'getQuotes' : 'getSellQuotes',
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedAsset?.id,
    selectedFiatCurrencyId,
    amount,
    selectedAddress,
  );

  const quotes = useMemo(() => {
    const sortOrderByPrice = data?.sorted.find(
      ({ sortBy }) => sortBy === QuoteSortBy.price,
    )?.ids;

    if (sortOrderByPrice) {
      const sortOrderMap = new Map(
        sortOrderByPrice.map((id, index) => [id, index]),
      );

      return data?.quotes.sort((a, b) => {
        return (
          (sortOrderMap.get(a.provider.id) ?? 0) -
          (sortOrderMap.get(b.provider.id) ?? 0)
        );
      });
    }

    return data?.quotes;
  }, [data]);

  return {
    quotes,
    sorted: data?.sorted,
    isFetching,
    error,
    query,
  };
}

export default useQuotes;
