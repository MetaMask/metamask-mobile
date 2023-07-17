import { useFiatOnRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';

function useQuotes(amount: number) {
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
  } = useFiatOnRampSDK();
  const [{ data, isFetching, error }, query] = useSDKMethod(
    'getQuotes',
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
