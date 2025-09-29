import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import type { DepositPaymentMethod } from '@consensys/native-ramps-sdk';

export function usePaymentMethods() {
  const {
    selectedRegion,
    selectedCryptoCurrency,
    setSelectedPaymentMethod,
    selectedPaymentMethod,
  } = useDepositSDK();

  const [
    { data: paymentMethods, error, isFetching },
    retryFetchPaymentMethods,
  ] = useDepositSdkMethod(
    'getPaymentMethods',
    selectedRegion?.isoCode,
    selectedCryptoCurrency?.assetId,
    selectedRegion?.currency,
  );

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      let newSelectedPaymentMethod: DepositPaymentMethod | null = null;

      if (selectedPaymentMethod) {
        newSelectedPaymentMethod =
          paymentMethods.find(
            (method) => method.id === selectedPaymentMethod.id,
          ) || null;
      }

      if (!newSelectedPaymentMethod) {
        newSelectedPaymentMethod = paymentMethods[0];
      }

      if (newSelectedPaymentMethod) {
        setSelectedPaymentMethod(newSelectedPaymentMethod);
      }
    }
  }, [paymentMethods, selectedPaymentMethod, setSelectedPaymentMethod]);

  return {
    paymentMethods,
    error,
    isFetching,
    retryFetchPaymentMethods,
  };
}
