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
  
  console.log('__ CLIENT__ usePaymentMethods hook called with dependencies:', {
    selectedRegion,
    selectedCryptoCurrency,
    regionIsoCode: selectedRegion?.isoCode,
    cryptoAssetId: selectedCryptoCurrency?.assetId,
    regionCurrency: selectedRegion?.currency,
  });

  // Only fetch when we have all three required dependencies
  const shouldFetch = Boolean(
    selectedRegion?.isoCode && 
    selectedCryptoCurrency?.assetId &&
    selectedRegion?.currency
  );

  const [{ data: paymentMethods, error, isFetching }, query] = useDepositSdkMethod(
    { method: 'getPaymentMethods', onMount: false }, // Always start with onMount false
    selectedRegion?.isoCode,
    selectedCryptoCurrency?.assetId,
    selectedRegion?.currency,
  );

  console.log('__ CLIENT__ usePaymentMethods result:', {
    shouldFetch,
    paymentMethods,
    error,
    isFetching,
  });

  // Use useEffect to manually trigger the fetch when dependencies are ready
  useEffect(() => {
    console.log('__ CLIENT__ usePaymentMethods useEffect - shouldFetch:', shouldFetch, {
      regionIsoCode: selectedRegion?.isoCode,
      cryptoAssetId: selectedCryptoCurrency?.assetId,
      regionCurrency: selectedRegion?.currency,
    });
    if (shouldFetch) {
      console.log('__ CLIENT__ usePaymentMethods manually triggering query');
      query();
    }
  }, [shouldFetch, query, selectedRegion?.isoCode, selectedCryptoCurrency?.assetId, selectedRegion?.currency]);

  // Add a separate effect to watch for SDK context changes after remounting
  useEffect(() => {
    console.log('__ CLIENT__ usePaymentMethods SDK context watcher:', {
      hasRegion: !!selectedRegion,
      hasCrypto: !!selectedCryptoCurrency,
      regionIsoCode: selectedRegion?.isoCode,
      cryptoAssetId: selectedCryptoCurrency?.assetId,
    });
  }, [selectedRegion, selectedCryptoCurrency]);

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethod) {
      console.log('__ CLIENT__ usePaymentMethods setting first payment method:', paymentMethods[0]);
      setSelectedPaymentMethod(paymentMethods[0]);
    }
  }, [paymentMethods, selectedPaymentMethod, setSelectedPaymentMethod]);

  return {
    paymentMethods,
    error,
    isFetching,
  };
}
