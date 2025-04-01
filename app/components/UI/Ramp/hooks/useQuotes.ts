import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';

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

  return {
    quotes: data?.quotes,
    sorted: data?.sorted,
    isFetching,
    error,
    query,
  };
}

export default useQuotes;
