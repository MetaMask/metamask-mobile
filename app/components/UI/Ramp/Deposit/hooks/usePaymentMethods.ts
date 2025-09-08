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
  console.log('selectedRegion', selectedRegion);
  console.log('selectedCryptoCurrency', selectedCryptoCurrency);

  console.log('selectedRegion?.isoCode', selectedRegion?.isoCode);
  console.log(
    'selectedCryptoCurrency?.assetId',
    selectedCryptoCurrency?.assetId,
  );

  const [{ data: paymentMethods, error, isFetching }] = useDepositSdkMethod(
    'getPaymentMethods',
    selectedRegion?.isoCode,
    selectedCryptoCurrency?.assetId,
    selectedRegion?.currency,
  );

  console.log('error', error);

  console.log('paymentMethods', paymentMethods);

  useEffect(() => {
    console.log(
      'SETTING PAYMENT METHOD',
      paymentMethods?.[0],
      selectedPaymentMethod,
    );
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
