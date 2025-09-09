import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import { useEffect } from 'react';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk/dist/Deposit';

export interface UseCryptoCurrenciesResult {
  cryptoCurrencies: DepositCryptoCurrency[] | null;
  isFetching: boolean;
  error: string | null;
}

export function useCryptoCurrencies(): UseCryptoCurrenciesResult {
  const { selectedRegion, selectedCryptoCurrency, setSelectedCryptoCurrency } =
    useDepositSDK();

  console.log('__ CLIENT__ useCryptoCurrencies selectedRegion:', selectedRegion);
  
  // Only fetch when we have a selected region
  const shouldFetch = Boolean(selectedRegion?.isoCode);
  
  const [{ data: cryptoCurrencies, error, isFetching }] = useDepositSdkMethod(
    { method: 'getCryptoCurrencies', onMount: shouldFetch },
    selectedRegion?.isoCode,
  );

  console.log('__ CLIENT__ useCryptoCurrencies result:', {
    shouldFetch,
    regionIsoCode: selectedRegion?.isoCode,
    cryptoCurrencies,
    error,
    isFetching,
  });

  useEffect(() => {
    if (cryptoCurrencies && cryptoCurrencies.length > 0 && !selectedCryptoCurrency) {
      console.log('__ CLIENT__ useCryptoCurrencies setting first crypto currency:', cryptoCurrencies[0]);
      setSelectedCryptoCurrency(cryptoCurrencies[0]);
    }
  }, [cryptoCurrencies, selectedCryptoCurrency, setSelectedCryptoCurrency]);

  return {
    cryptoCurrencies,
    isFetching,
    error,
  };
}
