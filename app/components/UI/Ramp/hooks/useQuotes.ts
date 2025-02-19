import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { useMemo } from 'react';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';
import { sortQuotes } from '../utils';

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

  const quotes = useMemo(
    () => sortQuotes(data?.quotes, data?.sorted, QuoteSortBy.price),
    [data],
  );

  return {
    quotes,
    sorted: data?.sorted,
    isFetching,
    error,
    query,
  };
}

export default useQuotes;
