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

  // auto-select the first payment method if the current one is not in the list
  useEffect(() => {
    const isPaymentMethodInList = Boolean(
      paymentMethods?.filter((method) => method.id === currentPaymentMethod?.id)
        .length,
    );
    if (
      !isFetching &&
      !error &&
      currentPaymentMethod &&
      !isPaymentMethodInList
    ) {
      setSelectedPaymentMethodId(paymentMethods?.[0]?.id || null);
    }
  }, [
    currentPaymentMethod,
    error,
    isFetching,
    paymentMethods,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
  ]);

  // auto-select the first payment method if there is no current one
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
