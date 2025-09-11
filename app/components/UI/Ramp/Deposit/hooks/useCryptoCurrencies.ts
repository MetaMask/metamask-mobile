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

  const [{ data: cryptoCurrencies, error, isFetching }] = useDepositSdkMethod(
    'getCryptoCurrencies',
    selectedRegion?.isoCode,
  );

  useEffect(() => {
    if (
      cryptoCurrencies &&
      cryptoCurrencies.length > 0 &&
      !selectedCryptoCurrency
    ) {
      setSelectedCryptoCurrency(cryptoCurrencies[0]);
    }
  }, [cryptoCurrencies, selectedCryptoCurrency, setSelectedCryptoCurrency]);

  return {
    cryptoCurrencies,
    isFetching,
    error,
  };
}
