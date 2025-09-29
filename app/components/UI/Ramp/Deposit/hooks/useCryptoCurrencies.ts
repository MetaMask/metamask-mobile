import {
  useDepositSdkMethod,
  DepositSdkMethodQuery,
} from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import { useEffect } from 'react';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';

export interface UseCryptoCurrenciesResult {
  cryptoCurrencies: DepositCryptoCurrency[] | null;
  isFetching: boolean;
  error: string | null;
  retryFetchCryptoCurrencies: DepositSdkMethodQuery<'getCryptoCurrencies'>;
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
        newSelectedCrypto =
          cryptoCurrencies.find(
            (crypto) => crypto.assetId === selectedCryptoCurrency.assetId,
          ) || null;
      }

      if (!newSelectedCrypto) {
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
