import { useRampSDK } from '../../common/sdk';
import useSDKMethod from '../../common/hooks/useSDKMethod';
import { RampType } from '../../common/types';

function useQuotes(amount: number) {
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
    rampType,
  } = useRampSDK();
  const [{ data, isFetching, error }, query] = useSDKMethod(
    rampType === RampType.BUY ? 'getQuotes' : 'getSellQuotes',
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
