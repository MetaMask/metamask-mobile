import { useRampSDK } from '../../common/sdk';
import useSDKMethod from '../../common/hooks/useSDKMethod';

function useQuotes(amount: number) {
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
    data,
    isFetching,
    error,
    query,
  };
}

export default useQuotes;
