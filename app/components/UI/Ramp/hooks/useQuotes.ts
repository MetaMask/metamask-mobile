import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { useMemo } from 'react';

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

  const quotes = useMemo(() => data?.quotes || null, [data]);

  return {
    quotes,
    isFetching,
    error,
    query,
  };
}

export default useQuotes;
