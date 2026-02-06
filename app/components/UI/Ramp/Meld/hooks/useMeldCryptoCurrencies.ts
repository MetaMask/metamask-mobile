/**
 * Hook to fetch Meld crypto currencies for the selected country.
 *
 * Replaces: useCryptoCurrencies from the aggregator pattern.
 * Maps to: GET /service-providers/properties/crypto-currencies
 */

import { useCallback, useEffect } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import useMeldApi from './useMeldApi';
import { MeldCryptoCurrency } from '../types';

export default function useMeldCryptoCurrencies() {
  const { selectedCountry, selectedCrypto, setSelectedCrypto } =
    useMeldContext();

  const countryCode = selectedCountry?.countryCode ?? null;

  const fetchCryptos = useCallback(
    () =>
      countryCode
        ? meldApi.getCryptoCurrencies(countryCode)
        : Promise.resolve([]),
    [countryCode],
  );

  const [{ data: cryptoCurrencies, isFetching, error }, refetch] = useMeldApi<
    MeldCryptoCurrency[]
  >(countryCode ? fetchCryptos : null, [countryCode]);

  // Auto-select ETH on Ethereum if none selected
  useEffect(() => {
    if (cryptoCurrencies && cryptoCurrencies.length > 0 && !selectedCrypto) {
      const eth = cryptoCurrencies.find(
        (c) => c.currencyCode === 'ETH' && c.chainCode === 'ETH',
      );
      setSelectedCrypto(eth ?? cryptoCurrencies[0]);
    }
  }, [cryptoCurrencies, selectedCrypto, setSelectedCrypto]);

  return {
    cryptoCurrencies,
    isFetching,
    error,
    refetch,
    selectedCrypto,
    setSelectedCrypto,
  };
}
