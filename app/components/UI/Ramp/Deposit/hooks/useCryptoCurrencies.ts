import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import { useEffect } from 'react';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk/dist/Deposit';

export interface UseCryptoCurrenciesResult {
  cryptoCurrencies: DepositCryptoCurrency[] | null;
  isFetching: boolean;
  error: string | null;
  retryFetchCryptoCurrencies: () => Promise<
    DepositCryptoCurrency[] | undefined
  >;
}

export function useCryptoCurrencies(): UseCryptoCurrenciesResult {
  const { selectedRegion, selectedCryptoCurrency, setSelectedCryptoCurrency } =
    useDepositSDK();

  const [
    { data: cryptoCurrencies, error, isFetching },
    retryFetchCryptoCurrencies,
  ] = useDepositSdkMethod('getCryptoCurrencies', selectedRegion?.isoCode);

  useEffect(() => {
    if (cryptoCurrencies && cryptoCurrencies.length > 0) {
      let newSelectedCrypto: DepositCryptoCurrency | null = null;

      if (selectedCryptoCurrency) {
        // Find the previously selected crypto in fresh data and reapply it
        newSelectedCrypto =
          cryptoCurrencies.find(
            (crypto) => crypto.assetId === selectedCryptoCurrency.assetId,
          ) || null;
      }

      if (!newSelectedCrypto) {
        // Fallback to first available crypto currency if previous selection not found
        newSelectedCrypto = cryptoCurrencies[0];
      }

      if (newSelectedCrypto) {
        setSelectedCryptoCurrency(newSelectedCrypto);
      }
    }
  }, [cryptoCurrencies, selectedCryptoCurrency, setSelectedCryptoCurrency]);

  return {
    cryptoCurrencies,
    isFetching,
    error,
    retryFetchCryptoCurrencies,
  };
}
