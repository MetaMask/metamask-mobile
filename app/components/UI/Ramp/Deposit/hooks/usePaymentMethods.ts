import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import { useDepositSdkMethod } from './useDepositSdkMethod';

function usePaymentMethods() {
  const {
    selectedRegion,
    selectedCryptoCurrency,
    setSelectedPaymentMethod,
    selectedPaymentMethod,
  } = useDepositSDK();

  const [{ data: paymentMethods, error, isFetching }] = useDepositSdkMethod(
    'getPaymentMethods',
    selectedRegion?.isoCode,
    selectedCryptoCurrency?.assetId,
  );

  useEffect(() => {
    if (paymentMethods && !selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0]);
    }
  }, [paymentMethods, selectedPaymentMethod, setSelectedPaymentMethod]);

  return {
    paymentMethods,
    error,
    isFetching,
  };
}

export default usePaymentMethods;
