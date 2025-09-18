import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';

function usePaymentMethods() {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedAsset,
    selectedFiatCurrencyId,
    setSelectedPaymentMethodId,
    isBuy,
  } = useRampSDK();

  const paymentMethodsMethod = isBuy
    ? 'getPaymentMethodsForCrypto'
    : 'getSellPaymentMethodsForCrypto';

  const [{ data: paymentMethods, isFetching, error }, queryGetPaymentMethods] =
    useSDKMethod(
      paymentMethodsMethod,
      selectedRegion?.id,
      selectedAsset?.id,
      selectedFiatCurrencyId,
    );

  const currentPaymentMethod = useMemo(
    () =>
      paymentMethods?.find((method) => method.id === selectedPaymentMethodId),
    [paymentMethods, selectedPaymentMethodId],
  );

  useEffect(() => {
    if (!isFetching && !error && !currentPaymentMethod && paymentMethods) {
      setSelectedPaymentMethodId(paymentMethods?.[0]?.id);
    }
  }, [
    error,
    paymentMethods,
    isFetching,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    currentPaymentMethod,
  ]);

  return {
    data: paymentMethods,
    isFetching,
    error,
    query: queryGetPaymentMethods,
    currentPaymentMethod,
  };
}

export default usePaymentMethods;
