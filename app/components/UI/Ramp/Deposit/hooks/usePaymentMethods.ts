import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import { useDepositSdkMethod } from './useDepositSdkMethod';

export function usePaymentMethods() {
  const {
    selectedRegion,
    selectedCryptoCurrency,
    setSelectedPaymentMethod,
    selectedPaymentMethod,
  } = useDepositSDK();

  // Only fetch when we have all three required dependencies
  const shouldFetch = Boolean(
    selectedRegion?.isoCode &&
      selectedCryptoCurrency?.assetId &&
      selectedRegion?.currency,
  );

  const [{ data: paymentMethods, error, isFetching }, query] =
    useDepositSdkMethod(
      { method: 'getPaymentMethods', onMount: false }, // Always start with onMount false
      selectedRegion?.isoCode,
      selectedCryptoCurrency?.assetId,
      selectedRegion?.currency,
    );

  // Use useEffect to manually trigger the fetch when dependencies are ready
  useEffect(() => {
    if (shouldFetch) {
      query();
    }
  }, [
    shouldFetch,
    query,
    selectedRegion?.isoCode,
    selectedCryptoCurrency?.assetId,
    selectedRegion?.currency,
  ]);

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0]);
    }
  }, [paymentMethods, selectedPaymentMethod, setSelectedPaymentMethod]);

  return {
    paymentMethods,
    error,
    isFetching,
  };
}
